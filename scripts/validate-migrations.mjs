/**
 * Valida las migraciones de Supabase ejecutándolas contra un PostgreSQL
 * en proceso (PGlite). No sustituye a un entorno Supabase real, pero
 * detecta errores de sintaxis, referencias rotas, policies mal escritas y
 * fallos en las reglas de negocio antes de tocar la base de datos real.
 *
 * Uso: npm run db:validate
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(rootDir, 'supabase', 'migrations')
const seedFile = path.join(rootDir, 'supabase', 'seed.sql')

const MERCHE = '11111111-1111-1111-1111-111111111111'
const ANA = '22222222-2222-2222-2222-222222222222'
const LAURA = '33333333-3333-3333-3333-333333333333'
const WORKOUT = '44444444-4444-4444-4444-444444444444'
const CLASS = '55555555-5555-5555-5555-555555555555'

/**
 * Reproduce las piezas de Supabase que las migraciones dan por hechas:
 * roles, esquema auth y esquema storage.
 */
const SUPABASE_STUBS = `
  create role anon;
  create role authenticated;
  create role service_role;

  create schema if not exists auth;
  create schema if not exists storage;

  -- Supabase concede estos privilegios por defecto. Sin ellos el rol
  -- authenticated no podría leer nada y las pruebas de RLS no medirían nada.
  grant usage on schema public, auth, storage to anon, authenticated;
  alter default privileges in schema public
    grant all on tables to anon, authenticated;
  alter default privileges in schema public
    grant all on sequences to anon, authenticated;
  alter default privileges in schema storage
    grant all on tables to anon, authenticated;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );

  -- En Supabase devuelve el usuario del JWT. Aquí se simula con una GUC.
  create or replace function auth.uid() returns uuid
  language sql stable as $fn$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $fn$;

  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );

  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid
  );
  alter table storage.objects enable row level security;

  create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $fn$
    select string_to_array(name, '/');
  $fn$;
`

async function run() {
  const db = new PGlite()

  console.log('· Preparando entorno Supabase simulado…')
  await db.exec(SUPABASE_STUBS)

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    throw new Error('No se han encontrado migraciones en supabase/migrations')
  }

  try {
    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), 'utf8')
      try {
        await db.exec(sql)
        console.log(`  ✓ ${file}`)
      } catch (error) {
        console.error(`  ✗ ${file}\n    ${error.message}`)
        throw new Error(`La migración ${file} no se ha podido aplicar.`)
      }
    }

    console.log('· Aplicando seed…')
    try {
      await db.exec(await readFile(seedFile, 'utf8'))
      console.log('  ✓ seed.sql')
    } catch (error) {
      console.error(`  ✗ seed.sql\n    ${error.message}`)
      throw new Error('El seed no se ha podido aplicar.')
    }

    await runSmokeTests(db)
  } finally {
    await db.close()
  }
}

/**
 * Comprueba las reglas de negocio críticas: aforo, doble reserva,
 * permisos, asistencia y desbloqueo de recompensas.
 */
async function runSmokeTests(db) {
  console.log('· Ejecutando pruebas de reglas de negocio…')

  const results = []
  const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail })

  /**
   * Simula la sesión de una usuaria tal y como lo hace PostgREST:
   * fija el claim del JWT y cambia al rol `authenticated`, de modo que la
   * RLS se aplique de verdad (el propietario de las tablas la ignora).
   * Sin argumento vuelve al rol propietario, equivalente al editor SQL.
   */
  const signInAs = async (userId = '') => {
    await db.exec('reset role;')
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId])
    if (userId) {
      await db.exec('set role authenticated;')
    }
  }

  /** Ejecuta una sentencia esperando que falle con un código concreto. */
  const expectFailure = async (sql, expected) => {
    try {
      await db.query(sql)
      return { ok: false, detail: 'no lanzó ningún error' }
    } catch (error) {
      return {
        ok: error.message.includes(expected),
        detail: error.message.split('\n')[0],
      }
    }
  }

  // ---- Alta de usuarias -------------------------------------------------
  await signInAs()
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${MERCHE}', 'merche@example.com', '{"name":"Merche"}'),
      ('${ANA}', 'ana@example.com', '{"name":"Ana"}'),
      ('${LAURA}', 'laura@example.com', '{"name":"Laura"}');
  `)

  const profiles = await db.query(
    'select id, name, role from public.profiles order by name',
  )
  check(
    'El trigger crea un perfil por cada alta en auth.users',
    profiles.rows.length === 3,
    `perfiles=${profiles.rows.length}`,
  )
  check(
    'El nombre se toma de raw_user_meta_data',
    profiles.rows.some((row) => row.name === 'Ana'),
  )

  // ---- Rol admin --------------------------------------------------------
  await db.query(`update public.profiles set role = 'admin' where id = '${MERCHE}'`)
  const admin = await db.query(`select role from public.profiles where id = '${MERCHE}'`)
  check(
    'El primer admin puede crearse desde el editor SQL',
    admin.rows[0].role === 'admin',
  )

  await signInAs(ANA)
  const selfPromotion = await expectFailure(
    `update public.profiles set role = 'admin' where id = '${ANA}'`,
    'ROLE_CHANGE_NOT_ALLOWED',
  )
  check('Una alumna no puede ascenderse a admin', selfPromotion.ok, selfPromotion.detail)

  // ---- Clases recurrentes martes/jueves 19:00 ---------------------------
  await signInAs()
  const recurringCount = await db.query(`
    select count(*)::int as total
    from public.classes c
    join public.workouts w on w.id = c.workout_id
    where c.start_time = '19:00'
      and c.status = 'scheduled'
      and lower(trim(w.title)) in ('full body', 'emom táctico', 'emom tactico')
      and c.date >= current_date
  `)
  check(
    'La migración genera clases recurrentes futuras',
    recurringCount.rows[0].total > 0,
    `clases=${recurringCount.rows[0].total}`,
  )

  const wrongWeekday = await db.query(`
    select count(*)::int as total
    from public.classes c
    join public.workouts w on w.id = c.workout_id
    where c.start_time = '19:00'
      and lower(trim(w.title)) in ('full body', 'emom táctico', 'emom tactico')
      and extract(dow from c.date) not in (2, 4)
  `)
  check(
    'Las clases recurrentes solo caen martes o jueves',
    wrongWeekday.rows[0].total === 0,
    `fuera_de_dia=${wrongWeekday.rows[0].total}`,
  )

  const beforeRecurring = await db.query('select count(*)::int as total from public.classes')
  await db.query('select public.ensure_recurring_classes(12)')
  const afterRecurring = await db.query('select count(*)::int as total from public.classes')
  check(
    'ensure_recurring_classes es idempotente',
    beforeRecurring.rows[0].total === afterRecurring.rows[0].total,
    `antes=${beforeRecurring.rows[0].total}, después=${afterRecurring.rows[0].total}`,
  )

  // ---- Clase con una sola plaza -----------------------------------------
  await signInAs()
  await db.exec(`
    insert into public.workouts (id, title, poster_url)
    values ('${WORKOUT}', 'FULL BODY', '/assets/workouts/full-body.jpg');

    insert into public.classes (id, workout_id, date, start_time, location, capacity, created_by)
    values ('${CLASS}', '${WORKOUT}', (current_date + 7), '20:00', 'Urbanización', 1, '${MERCHE}');
  `)

  await signInAs(ANA)
  await db.query(`select public.book_class('${CLASS}')`)
  const booked = await db.query(
    `select count(*)::int as total from public.class_bookings where class_id = '${CLASS}' and status = 'active'`,
  )
  check('Ana reserva su plaza', booked.rows[0].total === 1)

  const bookingNotification = await db.query(
    `select type, title from public.notifications where user_id = '${ANA}' order by created_at desc limit 1`,
  )
  check(
    'Reservar clase crea notificación de confirmación',
    bookingNotification.rows[0]?.type === 'booking_confirmed',
    JSON.stringify(bookingNotification.rows[0]),
  )

  const doubleBooking = await expectFailure(
    `select public.book_class('${CLASS}')`,
    'ALREADY_BOOKED',
  )
  check(
    'La misma alumna no puede reservar dos veces',
    doubleBooking.ok,
    doubleBooking.detail,
  )

  await signInAs(LAURA)
  const overbooking = await expectFailure(
    `select public.book_class('${CLASS}')`,
    'CLASS_FULL',
  )
  check('No se puede superar el aforo', overbooking.ok, overbooking.detail)

  // ---- Cancelación libera plaza -----------------------------------------
  await signInAs(ANA)
  await db.query(`select public.cancel_booking('${CLASS}')`)
  const cancelled = await db.query(
    `select status from public.class_bookings where class_id = '${CLASS}' and user_id = '${ANA}'`,
  )
  check('Cancelar libera la plaza', cancelled.rows[0].status === 'cancelled')

  await signInAs(LAURA)
  await db.query(`select public.book_class('${CLASS}')`)
  const availability = await db.query(
    `select booked_count, available_count from public.class_availability where class_id = '${CLASS}'`,
  )
  check(
    'La vista de disponibilidad refleja el aforo real',
    availability.rows[0].booked_count === 1 && availability.rows[0].available_count === 0,
    JSON.stringify(availability.rows[0]),
  )

  // ---- Aislamiento entre alumnas ----------------------------------------
  const otherBookings = await db.query(
    `select count(*)::int as total from public.class_bookings where user_id = '${ANA}'`,
  )
  check('Una alumna no ve las reservas de otra', otherBookings.rows[0].total === 0)

  // ---- Asistencia -------------------------------------------------------
  const forbidden = await expectFailure(
    `select * from public.confirm_class_attendance('${CLASS}', array['${LAURA}']::uuid[])`,
    'FORBIDDEN',
  )
  check('Una alumna no puede confirmar asistencia', forbidden.ok, forbidden.detail)

  const writeAttendance = await expectFailure(
    `insert into public.attendance (class_id, user_id, attended) values ('${CLASS}', '${LAURA}', true)`,
    'row-level security',
  )
  check(
    'Una alumna no puede escribir en attendance',
    writeAttendance.ok,
    writeAttendance.detail,
  )

  await signInAs(MERCHE)
  const unlocked = await db.query(
    `select * from public.confirm_class_attendance('${CLASS}', array['${LAURA}']::uuid[])`,
  )
  check(
    'Confirmar asistencia desbloquea la primera recompensa',
    unlocked.rows.length === 1 && unlocked.rows[0].reward_name === 'Primer paso',
    JSON.stringify(unlocked.rows),
  )

  const total = await db.query(`select public.workout_count('${LAURA}') as total`)
  check('El contador de entrenamientos suma 1', total.rows[0].total === 1)

  const classStatus = await db.query(
    `select status from public.classes where id = '${CLASS}'`,
  )
  check(
    'La clase queda marcada como completada',
    classStatus.rows[0].status === 'completed',
  )

  const repeat = await db.query(
    `select * from public.confirm_class_attendance('${CLASS}', array['${LAURA}']::uuid[])`,
  )
  check(
    'No se duplican recompensas al reconfirmar',
    repeat.rows.length === 0,
    JSON.stringify(repeat.rows),
  )

  // ---- Recompensa física: pendiente de entrega --------------------------
  await db.query(`
    insert into public.attendance (class_id, user_id, attended, confirmed_by, confirmed_at)
    select c.id, '${LAURA}', true, '${MERCHE}', now()
    from public.classes c
    cross join generate_series(1, 1)
    where c.id = '${CLASS}'
    on conflict (class_id, user_id) do nothing
  `)
  await db.query(
    `update public.rewards set required_workouts = 1 where name = 'Imparable'`,
  )
  const physical = await db.query(`select * from public.sync_user_rewards('${LAURA}')`)
  check(
    'Las recompensas físicas quedan pendientes de entrega',
    physical.rows.some(
      (row) => row.reward_name === 'Imparable' && row.status === 'pending_delivery',
    ),
    JSON.stringify(physical.rows),
  )

  const pending = await db.query(
    `select ur.id from public.user_rewards ur
     join public.rewards r on r.id = ur.reward_id
     where ur.user_id = '${LAURA}' and r.name = 'Imparable'`,
  )
  await db.query(`select public.mark_reward_delivered('${pending.rows[0].id}')`)
  const delivered = await db.query(
    `select status, delivered_at from public.user_rewards where id = '${pending.rows[0].id}'`,
  )
  check(
    'Merche puede marcar el premio como entregado',
    delivered.rows[0].status === 'delivered' && delivered.rows[0].delivered_at !== null,
  )

  // ---- Clase pasada y cancelada -----------------------------------------
  await signInAs()
  await db.exec(`
    insert into public.classes (id, workout_id, date, start_time, location, capacity)
    values
      ('66666666-6666-6666-6666-666666666666', '${WORKOUT}', (current_date - 1), '20:00', 'Urbanización', 10),
      ('77777777-7777-7777-7777-777777777777', '${WORKOUT}', (current_date + 7), '20:00', 'Urbanización', 10);
    update public.classes set status = 'cancelled' where id = '77777777-7777-7777-7777-777777777777';
  `)

  await signInAs(ANA)
  const pastClass = await expectFailure(
    `select public.book_class('66666666-6666-6666-6666-666666666666')`,
    'CLASS_IN_PAST',
  )
  check('No se puede reservar una clase pasada', pastClass.ok, pastClass.detail)

  const cancelledClass = await expectFailure(
    `select public.book_class('77777777-7777-7777-7777-777777777777')`,
    'CLASS_CANCELLED',
  )
  check(
    'No se puede reservar una clase cancelada',
    cancelledClass.ok,
    cancelledClass.detail,
  )

  // ---- Permisos de escritura de contenido -------------------------------
  const createClass = await expectFailure(
    `insert into public.classes (workout_id, date, start_time, location, capacity)
     values ('${WORKOUT}', (current_date + 3), '19:00', 'Urbanización', 12)`,
    'row-level security',
  )
  check('Una alumna no puede crear clases', createClass.ok, createClass.detail)

  const createWorkout = await expectFailure(
    `insert into public.workouts (title, poster_url) values ('Hackeo', '/x.jpg')`,
    'row-level security',
  )
  check(
    'Una alumna no puede crear entrenamientos',
    createWorkout.ok,
    createWorkout.detail,
  )

  // ---- Visibilidad de publicaciones -------------------------------------
  await signInAs()
  await db.exec(`
    insert into public.posts (title, content, published) values
      ('Septiembre', 'Volvemos con todo', true),
      ('Borrador', 'Todavía no', false);
  `)
  await signInAs(ANA)
  const visiblePosts = await db.query('select count(*)::int as total from public.posts')
  check(
    'Una alumna solo ve publicaciones publicadas',
    visiblePosts.rows[0].total === 1,
  )

  // ---- Notificaciones y pagos -------------------------------------------
  const anaPaymentsInsert = await expectFailure(
    `insert into public.payments (user_id, month, amount_cents) values ('${ANA}', '2026-08', 4500)`,
    'row-level security',
  )
  check('Una alumna no puede crear pagos', anaPaymentsInsert.ok, anaPaymentsInsert.detail)

  await signInAs(MERCHE)
  await db.query(
    `insert into public.payments (user_id, month, amount_cents, status) values ('${ANA}', '2026-08', 4500, 'pending')`,
  )
  await db.query(
    `insert into public.notifications (user_id, type, title, body) values ('${LAURA}', 'custom', 'Hola', 'Prueba manual')`,
  )

  await signInAs(ANA)
  const ownPayments = await db.query(
    `select count(*)::int as total from public.payments where user_id = '${ANA}'`,
  )
  check('Una alumna ve sus propios pagos', ownPayments.rows[0].total === 1)

  const lauraNotifications = await db.query(
    `select count(*)::int as total from public.notifications where user_id = '${LAURA}'`,
  )
  check('Una alumna no ve avisos de otra', lauraNotifications.rows[0].total === 0)

  await signInAs(MERCHE)
  const profilesList = await db.query(`select * from public.admin_list_profiles()`)
  check(
    'Admin puede listar perfiles con email',
    profilesList.rows.length === 3,
    `perfiles=${profilesList.rows.length}`,
  )

  const participants = await db.query(
    `select * from public.admin_get_class_participants('${CLASS}')`,
  )
  check(
    'Admin ve participantes de una clase',
    participants.rows.some((row) => row.user_id === LAURA),
    JSON.stringify(participants.rows),
  )

  const reminderStub = await db.query(`select public.notify_class_reminders() as total`)
  check('notify_class_reminders stub responde 0', reminderStub.rows[0].total === 0)

  let failed = 0
  for (const result of results) {
    if (result.ok) {
      console.log(`  ✓ ${result.name}`)
    } else {
      failed += 1
      console.error(`  ✗ ${result.name}${result.detail ? ` → ${result.detail}` : ''}`)
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} prueba(s) de reglas de negocio han fallado.`)
  }

  console.log(`\nTodas las pruebas (${results.length}) han pasado.`)
}

run().catch((error) => {
  console.error(`\n${error.message}`)
  process.exitCode = 1
})
