import { IconWhatsApp } from "@/components/icons";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export default function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink(whatsappMessages.general())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed right-5 bottom-24 z-[999] flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_8px_20px_rgba(31,168,85,0.35)] transition-transform hover:scale-105 md:right-8 md:bottom-8"
    >
      <IconWhatsApp size={28} />
    </a>
  );
}
