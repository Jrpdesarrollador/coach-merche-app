import { TopBar } from '@/components/navigation/TopBar'
import { MailIcon, WhatsAppIcon } from '@/components/icons'
import { Card, CardLabel } from '@/components/ui'
import {
  CONTACT,
  ContactCard,
  FaqAccordion,
  FAQ_ITEMS,
  INSTAGRAM_QR_SRC,
} from '@/features/info'

export function InfoPage() {
  return (
    <>
      <TopBar title="Información y ayuda" showBack />

      <section className="flex flex-col gap-5 pt-2">
        <Card highlight className="flex flex-col gap-3">
          <CardLabel>Contacto Merche</CardLabel>
          <p className="text-sm leading-relaxed text-ink-muted">
            ¿Dudas, cambios o apoyo? Escríbenos por WhatsApp, email o síguenos en Instagram.
            Clases en la zona de {CONTACT.zone}.
          </p>

          <div className="flex flex-col gap-3">
            <ContactCard
              href={CONTACT.whatsappUrl}
              label="WhatsApp"
              description={CONTACT.whatsappLabel}
              icon={<WhatsAppIcon width={24} height={24} />}
            />
            <ContactCard
              href={`mailto:${CONTACT.email}`}
              label="Email"
              description={CONTACT.email}
              icon={<MailIcon width={24} height={24} />}
              external={false}
            />
          </div>
        </Card>

        <Card className="flex flex-col items-center gap-3 text-center">
          <CardLabel>Instagram</CardLabel>
          <a
            href={CONTACT.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full max-w-[12rem] overflow-hidden rounded-xl border border-line-gold bg-white p-3 transition-[border-color,transform] duration-150 hover:border-lime active:scale-[0.98]"
          >
            <img
              src={INSTAGRAM_QR_SRC}
              alt={`Código QR de Instagram ${CONTACT.instagramHandle}`}
              className="mx-auto aspect-square w-full object-contain"
            />
          </a>
          <p className="text-sm text-ink-soft">
            Escanea o pulsa para abrir{' '}
            <span className="font-semibold text-gold">{CONTACT.instagramHandle}</span>
          </p>
        </Card>

        <div className="flex flex-col gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">Preguntas frecuentes</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Respuestas rápidas sobre la app, tus clases y tu cuenta.
            </p>
          </div>
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>
    </>
  )
}
