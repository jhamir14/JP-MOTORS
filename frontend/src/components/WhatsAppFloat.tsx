import { IconWhatsApp } from "@/components/icons";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export default function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink(whatsappMessages.general())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="group fixed right-4 bottom-24 z-[999] flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_12px_30px_-8px_rgba(31,168,85,0.6)] transition-transform duration-300 hover:scale-105 md:right-8 md:bottom-8"
    >
      <span aria-hidden className="absolute inset-0 rounded-full bg-whatsapp opacity-40 motion-safe:animate-ping [animation-duration:2.6s]" />
      <IconWhatsApp size={28} className="relative" />
    </a>
  );
}
