import { IconWhatsApp } from "@/components/icons";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export default function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink(whatsappMessages.general())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed right-5 bottom-20 z-[1000] flex size-[60px] items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 md:right-8 md:bottom-8"
    >
      <IconWhatsApp size={32} />
    </a>
  );
}
