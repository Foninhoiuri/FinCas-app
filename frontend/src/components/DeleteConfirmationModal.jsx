import { AlertTriangle, Trash2 } from "lucide-react";
import { 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, 
  Button 
} from "@heroui/react";

/**
 * DeleteConfirmationModal
 * 
 * @param {boolean} isOpen - Controlled open state
 * @param {function} onClose - Function to close the modal
 * @param {function} onConfirm - Function to call on confirmation
 * @param {string} title - Modal title
 * @param {string} message - Warning message
 * @param {string} confirmText - Text for the confirm button
 * @param {boolean} isLoading - Loading state for the confirm button
 * @param {React.ReactNode} extraOptions - For additional buttons (like "Delete All Installments")
 */
export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Excluir registro?", 
  message = "Esta ação não pode ser desfeita. O registro será removido permanentemente.",
  confirmText = "Excluir permanentemente",
  isLoading = false,
  extraOptions = null
}) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-gradient-to-t from-red-950/90 via-red-950/50 to-transparent dark:from-red-950/95 dark:via-red-950/60",
        base: "border-t border-white/10 bg-surface-900 rounded-[32px]",
        header: "border-b border-white/5",
        footer: "border-t border-white/5",
        closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col items-center gap-4 text-center py-8">
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)]">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            </ModalHeader>
            
            <ModalBody className="text-center px-8 py-4">
              <p className="text-sm text-white/50 leading-relaxed">
                {message}
              </p>
            </ModalBody>
            
            <ModalFooter className="flex flex-col gap-2 p-6">
              {extraOptions}
              
              <Button 
                fullWidth 
                color="danger" 
                variant="shadow"
                className="font-bold h-12 rounded-full"
                onPress={onConfirm}
                isLoading={isLoading}
              >
                {confirmText}
              </Button>
              
              <Button 
                fullWidth 
                variant="light" 
                className="text-white/40 hover:text-white font-bold h-12 rounded-xl"
                onPress={onClose}
              >
                Cancelar e manter
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
