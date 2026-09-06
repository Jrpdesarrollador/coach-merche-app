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

/** Próximo martes o jueves (ISO) para pruebas de reserva. */
async function nextTueOrThuDate(db, offsetDays = 1) {
  const { rows } = await db.query(`
    select d::date as dt
    from generate_series(current_date + ${offsetDays}, current_date + 21, interval '1 day') as d
    where extract(dow from d) in (2, 4)
    order by d
    limit 1
  `)
  const dt = rows[0]?.dt
  if (!dt) throw new Error('No se encontró martes/jueves futuro para pruebas')
  if (typeof dt === 'string') return dt.slice(0, 10)
  if (dt instanceof Date) return dt.toISOString().slice(0, 10)
  return String(dt).slice(0, 10)
}

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
  await db.query(`
    update public.profiles
    set approval_status = 'approved', approved_at = now()
    where id in ('${ANA}', '${LAURA}')
  `)
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

  const beforeRecurring = await db.query(
    'select count(*)::int as total from public.classes',
  )
  await signInAs()
  await db.query('select public.ensure_recurring_classes(12)')
  const afterRecurring = await db.query(
    'select count(*)::int as total from public.classes',
  )
  check(
    'ensure_recurring_classes es idempotente',
    beforeRecurring.rows[0].total === afterRecurring.rows[0].total,
    `antes=${beforeRecurring.rows[0].total}, después=${afterRecurring.rows[0].total}`,
  )

  const wrongSchedule = await db.query(`
    select count(*)::int as total
    from public.classes c
    where c.status = 'scheduled'
      and (c.date + c.start_time) >= (now() at time zone 'Europe/Madrid')
      and not (
        extract(dow from c.date) in (2, 4)
        and c.start_time = '19:00'::time
      )
  `)
  check(
    'No quedan clases futuras fuera de mar/jue 19:00',
    wrongSchedule.rows[0].total === 0,
    `fuera_de_horario=${wrongSchedule.rows[0].total}`,
  )

  // ---- Admin cancela una fecha recurrente concreta ---------------------
  await signInAs()
  const recurringToCancel = await db.query(`
    select
      c.id,
      c.date::text as date,
      c.start_time::text as start_time,
      c.workout_id
    from public.classes c
    join public.class_availability a on a.class_id = c.id
    where c.status = 'scheduled'
      and (c.date + c.start_time) >= (now() at time zone 'Europe/Madrid')
      and a.available_count > 0
      and not exists (
        select 1
        from public.class_bookings b
        where b.class_id = c.id
          and b.user_id = '${ANA}'
          and b.status = 'active'
      )
    order by c.date, c.start_time
    limit 1
  `)
  const recurringClass = recurringToCancel.rows[0]

  await signInAs(ANA)
  await db.query(`select public.book_class('${recurringClass.id}')`)
  const cancelForbidden = await expectFailure(
    `select public.admin_cancel_class('${recurringClass.id}')`,
    'FORBIDDEN',
  )
  check(
    'Una alumna no puede eliminar una clase recurrente',
    cancelForbidden.ok,
    cancelForbidden.detail,
  )

  await signInAs(MERCHE)
  const cancelledByAdmin = await db.query(
    `select public.admin_cancel_class('${recurringClass.id}') as total`,
  )
  const cancelledClassState = await db.query(`
    select
      c.status,
      b.status as booking_status,
      exists (
        select 1
        from public.notifications n
        where n.user_id = '${ANA}'
          and n.type = 'custom'
          and n.metadata->>'class_id' = '${recurringClass.id}'
      ) as notified
    from public.classes c
    join public.class_bookings b on b.class_id = c.id and b.user_id = '${ANA}'
    where c.id = '${recurringClass.id}'
  `)
  check(
    'Merche elimina una clase concreta, cancela reservas y avisa',
    cancelledByAdmin.rows[0].total === 1 &&
      cancelledClassState.rows[0].status === 'cancelled' &&
      cancelledClassState.rows[0].booking_status === 'cancelled' &&
      cancelledClassState.rows[0].notified === true,
    JSON.stringify({
      result: cancelledByAdmin.rows[0],
      state: cancelledClassState.rows[0],
    }),
  )

  await signInAs()
  await db.query('select public.ensure_recurring_classes(12)')
  const cancelledClassCount = await db.query(`
    select count(*)::int as total
    from public.classes
    where date = '${recurringClass.date}'
      and start_time = '${recurringClass.start_time}'
      and workout_id = '${recurringClass.workout_id}'
  `)
  check(
    'La clase cancelada no reaparece al regenerar la serie',
    cancelledClassCount.rows[0].total === 1,
    JSON.stringify(cancelledClassCount.rows[0]),
  )

  // ---- Clase con una sola plaza -----------------------------------------
  const futureClassDate = await nextTueOrThuDate(db)
  await signInAs()
  await db.exec(`
    insert into public.workouts (id, title, poster_url)
    values ('${WORKOUT}', 'FULL BODY', '/assets/workouts/full-body.jpg');

    insert into public.classes (id, workout_id, date, start_time, location, capacity, created_by)
    values ('${CLASS}', '${WORKOUT}', '${futureClassDate}', '19:00', 'Box Coach Merche', 1, '${MERCHE}');
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

  // ---- Auto-confirmación de asistencia (+1 h) ---------------------------
  await signInAs()
  await db.exec(`
    insert into public.classes (id, workout_id, date, start_time, location, capacity, status)
    values ('88888888-8888-8888-8888-888888888888', '${WORKOUT}', (current_date - 2), '19:00', 'Box Coach Merche', 10, 'scheduled');

    insert into public.class_bookings (class_id, user_id, status)
    values ('88888888-8888-8888-8888-888888888888', '${ANA}', 'active');
  `)

  await signInAs(ANA)
  const autoBefore = await db.query(`select public.workout_count('${ANA}') as total`)
  check('Ana empieza sin entrenamientos auto-confirmados', autoBefore.rows[0].total === 0)

  const autoConfirmed = await db.query(
    `select public.process_auto_attendance('${ANA}') as total`,
  )
  check(
    'process_auto_attendance confirma reservas pasadas (+1 h)',
    autoConfirmed.rows[0].total === 1,
    JSON.stringify(autoConfirmed.rows[0]),
  )

  const autoAfter = await db.query(`select public.workout_count('${ANA}') as total`)
  check(
    'El contador refleja la asistencia auto-confirmada',
    autoAfter.rows[0].total === 1,
  )

  const autoRewardRows = await db.query(`
    select r.name
    from public.user_rewards ur
    join public.rewards r on r.id = ur.reward_id
    where ur.user_id = '${ANA}'
  `)
  check(
    'Auto-confirmación desbloquea recompensas',
    autoRewardRows.rows.some((row) => row.name === 'Primer paso'),
    JSON.stringify(autoRewardRows.rows),
  )

  const autoRepeat = await db.query(
    `select public.process_auto_attendance('${ANA}') as total`,
  )
  check(
    'process_auto_attendance es idempotente',
    autoRepeat.rows[0].total === 0,
    JSON.stringify(autoRepeat.rows[0]),
  )

  const futureClassDate2 = await nextTueOrThuDate(db, 2)
  await signInAs()
  await db.exec(`
    insert into public.classes (id, workout_id, date, start_time, location, capacity, status)
    values ('99999999-9999-9999-9999-999999999999', '${WORKOUT}', '${futureClassDate2}', '19:00', 'Box Coach Merche', 10, 'scheduled');
  `)
  await signInAs(ANA)
  await db.query(`select public.book_class('99999999-9999-9999-9999-999999999999')`)
  const futureAuto = await db.query(
    `select public.process_auto_attendance('${ANA}') as total`,
  )
  check(
    'No auto-confirma clases futuras',
    futureAuto.rows[0].total === 0,
    JSON.stringify(futureAuto.rows[0]),
  )

  await signInAs()
  await db.exec(`
    insert into public.classes (id, workout_id, date, start_time, location, capacity, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '${WORKOUT}', (current_date - 3), '10:00', 'Box Coach Merche', 10, 'scheduled');

    insert into public.class_bookings (class_id, user_id, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '${LAURA}', 'active');
  `)
  await signInAs(MERCHE)
  await db.query(
    `select * from public.confirm_class_attendance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{}'::uuid[])`,
  )
  await signInAs(LAURA)
  const adminOverride = await db.query(
    `select public.process_auto_attendance('${LAURA}') as total`,
  )
  check(
    'No auto-confirma si admin ya registró asistencia manual',
    adminOverride.rows[0].total === 0,
    JSON.stringify(adminOverride.rows[0]),
  )

  // ---- Recompensa física: pendiente de entrega --------------------------
  await signInAs(MERCHE)
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
  const cancelledClassDate = await nextTueOrThuDate(db, 7)
  await signInAs()
  await db.exec(`
    insert into public.classes (id, workout_id, date, start_time, location, capacity, status)
    values
      ('66666666-6666-6666-6666-666666666666', '${WORKOUT}', (current_date - 7), '20:00', 'Urbanización', 10, 'scheduled'),
      ('77777777-7777-7777-7777-777777777777', '${WORKOUT}', '${cancelledClassDate}', '19:00', 'Box Coach Merche', 10, 'cancelled');
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
  const rlsClassDate = await nextTueOrThuDate(db, 3)
  const createClass = await expectFailure(
    `insert into public.classes (workout_id, date, start_time, location, capacity)
     values ('${WORKOUT}', '${rlsClassDate}', '19:00', 'Urbanización', 12)`,
    'row-level security',
  )
  check('Una alumna no puede crear clases', createClass.ok, createClass.detail)

  await signInAs()
  const invalidSchedule = await expectFailure(
    `insert into public.classes (workout_id, date, start_time, location, capacity)
     values ('${WORKOUT}', (current_date + 3), '20:00', 'Box Coach Merche', 12)`,
    'INVALID_CLASS_SCHEDULE',
  )
  check(
    'Merche no puede programar clase fuera de mar/jue 19:00',
    invalidSchedule.ok,
    invalidSchedule.detail,
  )

  await signInAs(ANA)
  const createWorkout = await expectFailure(
    `insert into public.workouts (title, poster_url) values ('Hackeo', '/x.jpg')`,
    'row-level security',
  )
  check(
    'Una alumna no puede crear entrenamientos',
    createWorkout.ok,
    createWorkout.detail,
  )

  await signInAs()
  await db.exec(`
    update public.workouts
    set video_path = 'full-body-test.mp4'
    where id = '${WORKOUT}';

    insert into storage.objects (bucket_id, name, owner)
    values ('workout-videos', 'full-body-test.mp4', '${MERCHE}');
  `)

  await signInAs(ANA)
  const visibleWorkoutVideo = await db.query(`
    select w.requires_pro,
      exists (
        select 1
        from storage.objects o
        where o.bucket_id = 'workout-videos'
          and o.name = w.video_path
      ) as can_read_video
    from public.workouts w
    where w.id = '${WORKOUT}'
  `)
  check(
    'Alumna Basic ve entrenamientos y sus vídeos',
    visibleWorkoutVideo.rows[0]?.requires_pro === false &&
      visibleWorkoutVideo.rows[0]?.can_read_video === true,
    JSON.stringify(visibleWorkoutVideo.rows[0]),
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
  check('Una alumna solo ve publicaciones publicadas', visiblePosts.rows[0].total === 1)

  await signInAs(MERCHE)
  const notifyPost = await db.query(`
    insert into public.posts (title, content, published)
    values ('Aviso test', 'Contenido de prueba para alumnas', true)
    returning id
  `)
  const notifyPostId = notifyPost.rows[0].id

  const newPostNotifications = await db.query(`
    select count(*)::int as total
    from public.notifications
    where type = 'new_post'
      and metadata->>'post_id' = '${notifyPostId}'
  `)
  check(
    'notify_new_post crea avisos in-app para alumnas aprobadas y admins',
    newPostNotifications.rows[0].total === 3,
    `total=${newPostNotifications.rows[0].total}`,
  )

  const publishRpc = await db.query(`
    select public.publish_post_notifications('${notifyPostId}') as data
  `)
  check(
    'publish_post_notifications devuelve alumnas destinatarias',
    publishRpc.rows[0]?.data?.recipient_count === 3 &&
      publishRpc.rows[0]?.data?.already_sent === false,
    JSON.stringify(publishRpc.rows[0]?.data),
  )

  await db.exec('set role service_role;')
  await db.query(`select public.mark_post_notifications_sent('${notifyPostId}')`)
  await db.exec('reset role;')
  await signInAs(MERCHE)
  const publishAgain = await db.query(`
    select public.publish_post_notifications('${notifyPostId}') as data
  `)
  check(
    'publish_post_notifications evita duplicados',
    publishAgain.rows[0]?.data?.already_sent === true,
    JSON.stringify(publishAgain.rows[0]?.data),
  )

  await signInAs(MERCHE)
  const resetNotifications = await db.query(`
    select public.reset_post_notifications('${notifyPostId}') as ok
  `)
  check(
    'reset_post_notifications permite reintentar avisos',
    resetNotifications.rows[0]?.ok === true,
  )

  const publishAfterReset = await db.query(`
    select public.publish_post_notifications('${notifyPostId}') as data
  `)
  check(
    'Tras reset, publish_post_notifications vuelve a permitir envío',
    publishAfterReset.rows[0]?.data?.already_sent === false,
    JSON.stringify(publishAfterReset.rows[0]?.data),
  )

  // ---- Planificación diaria --------------------------------------------
  await signInAs(MERCHE)
  await db.query(`
    insert into public.daily_plans (plan_date, plan_time, workout_id, post_id, note)
    values (
      (now() at time zone 'Europe/Madrid')::date,
      '18:30',
      '${WORKOUT}',
      '${notifyPostId}',
      'Plan visible de hoy'
    )
  `)
  await db.query(`
    insert into public.daily_plans (plan_date, plan_time, workout_id, note)
    values ((now() at time zone 'Europe/Madrid')::date + 1, '20:00', '${WORKOUT}', 'Plan de mañana')
  `)

  const adminDailyPlans = await db.query(
    `select count(*)::int as total from public.daily_plans where plan_date >= (now() at time zone 'Europe/Madrid')::date`,
  )
  check(
    'Merche puede planificar entrenamiento y publicación por fecha',
    adminDailyPlans.rows[0]?.total === 2,
  )

  const classesCreatedFromPlans = await db.query(`
    select c.id, c.date, c.start_time, c.status, c.daily_plan_id
    from public.classes c
    join public.daily_plans dp on dp.id = c.daily_plan_id
    where dp.plan_date >= (now() at time zone 'Europe/Madrid')::date
    order by c.date
  `)
  check(
    'Cada entrenamiento planificado crea automáticamente una clase reservable',
    classesCreatedFromPlans.rows.length === 2 &&
      classesCreatedFromPlans.rows.every((row) => row.status === 'scheduled'),
    JSON.stringify(classesCreatedFromPlans.rows),
  )

  await signInAs(ANA)
  const visibleDailyPlans = await db.query(
    `select plan_date, plan_time, workout_id, post_id from public.daily_plans order by plan_date`,
  )
  check(
    'Una alumna ve los entrenamientos publicados en su calendario',
    visibleDailyPlans.rows.length === 2 &&
      visibleDailyPlans.rows[0]?.workout_id === WORKOUT &&
      visibleDailyPlans.rows[0]?.post_id === notifyPostId &&
      String(visibleDailyPlans.rows[0]?.plan_time).startsWith('18:30'),
    JSON.stringify(visibleDailyPlans.rows),
  )
  check(
    'Una alumna ve anticipadamente el entrenamiento de mañana',
    visibleDailyPlans.rows[1]?.workout_id === WORKOUT &&
      String(visibleDailyPlans.rows[1]?.plan_time).startsWith('20:00'),
  )

  const tomorrowPlanClass = classesCreatedFromPlans.rows.find(
    (row) => String(row.start_time).startsWith('20:00'),
  )
  const planBooking = await db.query(
    `select (public.book_class('${tomorrowPlanClass?.id}')).status as status`,
  )
  check(
    'Una alumna puede apuntarse a una clase creada desde el plan diario',
    planBooking.rows[0]?.status === 'active',
  )

  const scheduledNotifications = await db.query(`
    select count(*)::int as total
    from public.notifications
    where user_id = '${ANA}' and type = 'training_scheduled'
  `)
  check(
    'Planificar entrenamientos crea avisos in-app para alumnas aprobadas',
    scheduledNotifications.rows[0]?.total === 2,
  )

  const unauthorizedPlan = await expectFailure(
    `insert into public.daily_plans (plan_date, note) values ((now() at time zone 'Europe/Madrid')::date + 2, 'No permitido')`,
    'row-level security',
  )
  check(
    'Una alumna no puede crear ni cambiar la planificación',
    unauthorizedPlan.ok,
    unauthorizedPlan.detail,
  )

  // ---- Notificaciones y pagos -------------------------------------------
  await signInAs(ANA)
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

  const reminderCount = await db.query(`select public.notify_class_reminders() as total`)
  check(
    'notify_class_reminders responde entero >= 0',
    Number.isInteger(reminderCount.rows[0].total) && reminderCount.rows[0].total >= 0,
  )

  await signInAs(LAURA)
  await db.query(`
    select public.upsert_push_subscription(
      'https://push.example/test-endpoint',
      '{"p256dh":"abc","auth":"def"}'::jsonb
    )
  `)
  const pushSubs = await db.query(
    `select count(*)::int as total from public.push_subscriptions where user_id = '${LAURA}'`,
  )
  check('Alumna puede guardar suscripción push', pushSubs.rows[0].total === 1)

  await signInAs(MERCHE)
  const pendingRewards = await db.query(
    `select * from public.admin_list_pending_rewards()`,
  )
  check('Admin puede listar recompensas pendientes', Array.isArray(pendingRewards.rows))

  // ---- Roles Basic/Pro y aprobación -------------------------------------
  await signInAs()
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('88888888-8888-8888-8888-888888888888', 'nueva@example.com', '{"name":"Nueva"}');
  `)
  const pendingUser = await db.query(
    `select approval_status from public.profiles where id = '88888888-8888-8888-8888-888888888888'`,
  )
  check(
    'Nuevo registro queda en pending',
    pendingUser.rows[0]?.approval_status === 'pending',
  )

  await signInAs(MERCHE)
  await db.query(
    `select public.admin_approve_user('88888888-8888-8888-8888-888888888888', 'pro', 'monthly')`,
  )
  const approvedPro = await db.query(
    `select membership_tier, approval_status from public.profiles where id = '88888888-8888-8888-8888-888888888888'`,
  )
  check(
    'Admin puede aprobar como Pro',
    approvedPro.rows[0]?.membership_tier === 'pro' &&
      approvedPro.rows[0]?.approval_status === 'approved',
  )

  const proCheck = await db.query(
    `select public.is_pro_member('88888888-8888-8888-8888-888888888888') as is_pro`,
  )
  check(
    'is_pro_member devuelve true para Pro aprobada',
    proCheck.rows[0]?.is_pro === true,
  )

  const basicCheck = await db.query(`select public.is_pro_member('${ANA}') as is_pro`)
  check('Basic no es Pro', basicCheck.rows[0]?.is_pro === false)

  const usersStats = await db.query(`select * from public.admin_list_users_with_stats()`)
  check(
    'Admin lista usuarias con stats',
    usersStats.rows.length >= 4,
    `total=${usersStats.rows.length}`,
  )

  // ---- Borrado definitivo de alumnas manuales --------------------------
  const manualStudent = await db.query(`
    select (public.admin_create_student(
      'Carla Manual',
      null,
      null,
      'Prueba de borrado'
    )).id as id
  `)
  const manualStudentId = manualStudent.rows[0]?.id

  await db.query(`
    insert into public.chat_messages (user_id, sender_role, body)
    values ('${manualStudentId}', 'admin', 'Mensaje que debe borrarse en cascada')
  `)

  await signInAs(ANA)
  const unauthorizedManualDelete = await expectFailure(
    `select public.admin_delete_manual_student('${manualStudentId}')`,
    'permission denied',
  )
  check(
    'Una alumna no puede ejecutar el borrado manual protegido',
    unauthorizedManualDelete.ok,
    unauthorizedManualDelete.detail,
  )

  await signInAs()
  await db.exec('set role service_role;')
  const refusedRegisteredStudent = await db.query(
    `select public.admin_delete_manual_student('${ANA}') as deleted`,
  )
  const deletedManualStudent = await db.query(
    `select public.admin_delete_manual_student('${manualStudentId}') as deleted`,
  )
  await signInAs()

  const registeredStudentStillExists = await db.query(
    `select count(*)::int as total from auth.users where id = '${ANA}'`,
  )
  check(
    'El borrado manual protegido rechaza cuentas registradas',
    refusedRegisteredStudent.rows[0]?.deleted === false &&
      registeredStudentStillExists.rows[0]?.total === 1,
  )

  const deletedManualRows = await db.query(`
    select
      (select count(*)::int from auth.users where id = '${manualStudentId}') as auth_users,
      (select count(*)::int from public.profiles where id = '${manualStudentId}') as profiles,
      (select count(*)::int from public.chat_messages where user_id = '${manualStudentId}') as messages
  `)
  check(
    'Admin elimina definitivamente una alumna manual y sus datos',
    deletedManualStudent.rows[0]?.deleted === true &&
      deletedManualRows.rows[0]?.auth_users === 0 &&
      deletedManualRows.rows[0]?.profiles === 0 &&
      deletedManualRows.rows[0]?.messages === 0,
    JSON.stringify(deletedManualRows.rows[0]),
  )

  // ---- Chat -------------------------------------------------------------
  await signInAs(ANA)
  await db.query(`
    insert into public.chat_messages (user_id, sender_role, body)
    values ('${ANA}', 'user', 'Hola Merche, tengo una duda')
  `)
  const anaChat = await db.query(
    `select count(*)::int as total from public.chat_messages where user_id = '${ANA}'`,
  )
  check('Alumna ve su chat', anaChat.rows[0].total === 1)

  await signInAs(LAURA)
  const otherChat = await db.query(
    `select count(*)::int as total from public.chat_messages where user_id = '${ANA}'`,
  )
  check('Alumna no ve chat de otra', otherChat.rows[0].total === 0)

  await signInAs(MERCHE)
  const threads = await db.query(`select * from public.admin_list_chat_threads()`)
  check(
    'Admin ve hilos de chat',
    threads.rows.some((row) => row.user_id === ANA),
  )

  const report = await db.query(`select public.admin_export_report('month') as data`)
  check('admin_export_report devuelve JSON', report.rows[0]?.data?.period === 'month')

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
