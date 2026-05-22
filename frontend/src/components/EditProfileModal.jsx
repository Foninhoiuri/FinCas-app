import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, Check, AlertCircle, User as UserIcon, X, ZoomIn, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Slider, Spinner,
  Card, CardBody
} from "@heroui/react";

// Helper for crop
async function getCroppedImg(imageSrc, crop) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
  });
}

import { validateCPF, formatCPF } from '../utils/validation';

export default function EditProfileModal({ isOpen, onClose }) {
  const { user, login } = useAuth();
  const fileRef = useRef(null);

  const [name, setName] = useState(user?.full_name || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [cpf, setCpf] = useState(user?.cpf || '');

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [pin, setPin] = useState('');
  const [pinLength, setPinLength] = useState(4);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!croppedArea || !imageSrc) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedArea);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const updatedUser = await api.uploadAvatar(user.id, file);
      login({ ...user, ...updatedUser });
      setShowCropper(false);
      setImageSrc(null);
      setFeedback({ msg: 'Foto atualizada!', ok: true });
    } catch (err) {
      setFeedback({ msg: 'Erro no upload: ' + err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = { full_name: name, email, nickname, cpf };
      if (pin) {
        if (pin.length !== pinLength) {
          setFeedback({ msg: `O PIN deve ter ${pinLength} dígitos`, ok: false });
          setSaving(false);
          return;
        }
        payload.pin = pin;
      }
      const updatedUser = await api.updateMember(user.household_id, user.id, payload);
      login({ ...user, ...updatedUser });
      setFeedback({ msg: 'Perfil salvo!', ok: true });
      setTimeout(onClose, 1500);
    } catch (err) {
      setFeedback({ msg: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      placement="center" 
      backdrop="blur"
      size="md"
      classNames={{
        base: "bg-surface-900/60 border border-white/10 rounded-[40px] mx-4 overflow-hidden shadow-2xl backdrop-blur-3xl",
        header: "border-b border-white/5 p-8",
        body: "py-8 px-8",
        footer: "border-t border-white/5 p-6",
        closeButton: "hidden"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-4">
          <Button 
            isIconOnly 
            variant="flat" 
            onPress={onClose} 
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 shadow-xl hover:scale-110 active:scale-95 transition-all text-white/40 hover:text-white"
          >
            <ChevronLeft size={24} />
          </Button>
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase leading-none">Meu Perfil</h2>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mt-1">Configurações de Conta</p>
          </div>
        </ModalHeader>
        <ModalBody className="gap-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-white/5 bg-white/5 flex items-center justify-center shadow-2xl">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={32} className="text-white/10" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <Button isIconOnly variant="light" size="sm" onPress={() => fileRef.current?.click()} className="text-white">
                    <Camera size={18} />
                  </Button>
                </div>
              </div>
              <Button 
                isIconOnly 
                size="sm" 
                className="absolute -bottom-1 -right-1 bg-accent text-black rounded-xl shadow-lg border-2 border-surface-900"
                onPress={() => fileRef.current?.click()}
              >
                <Camera size={12} />
              </Button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
          </div>

          <div className="space-y-4">
            <Input 
              label="Nome Completo"
              value={name}
              onValueChange={setName}
              variant="flat"
              labelPlacement="outside"
              classNames={{
                label: "text-[10px] font-black uppercase tracking-widest text-white/30",
                inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl"
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Apelido"
                value={nickname}
                onValueChange={setNickname}
                variant="flat"
                labelPlacement="outside"
                classNames={{
                  label: "text-[10px] font-black uppercase tracking-widest text-white/30",
                  inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl"
                }}
              />
              <Input 
                label="CPF"
                value={cpf}
                onValueChange={(v) => setCpf(formatCPF(v))}
                variant="flat"
                labelPlacement="outside"
                errorMessage={cpf && !validateCPF(cpf) ? "CPF Inválido" : ""}
                isInvalid={cpf && !validateCPF(cpf)}
                classNames={{
                  label: "text-[10px] font-black uppercase tracking-widest text-white/30",
                  inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl"
                }}
              />
            </div>
            <Input 
              label="E-mail"
              type="email"
              value={email}
              onValueChange={setEmail}
              variant="flat"
              labelPlacement="outside"
              classNames={{
                label: "text-[10px] font-black uppercase tracking-widest text-white/30",
                inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl"
              }}
            />

          </div>

          {feedback && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${feedback.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {feedback.ok ? <Check size={16} /> : <AlertCircle size={16} />}
              <p className="text-[10px] font-black uppercase tracking-widest">{feedback.msg}</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button 
            fullWidth 
            color="primary" 
            onPress={handleSaveProfile} 
            isLoading={saving}
            className="bg-accent text-black font-black uppercase tracking-[0.2em] h-14 rounded-2xl shadow-xl shadow-accent/20 active:scale-95 transition-all"
          >
            Salvar Alterações
          </Button>
        </ModalFooter>

        {/* Nested Cropper Modal */}
        <Modal 
          isOpen={showCropper} 
          onClose={() => setShowCropper(false)} 
          size="full" 
          classNames={{ base: "bg-black" }}
        >
          <ModalContent>
            <ModalBody className="p-0 relative">
              <div className="absolute inset-0 z-0">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_area, areaPixels) => setCroppedArea(areaPixels)}
                />
              </div>
              
              <div className="absolute bottom-10 left-6 right-6 z-10 space-y-6">
                <div className="bg-black/60 backdrop-blur-xl p-6 rounded-[32px] border border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <ZoomIn size={16} className="text-white/40" />
                    <Slider 
                      aria-label="Zoom"
                      size="sm"
                      step={0.1} 
                      maxValue={3} 
                      minValue={1} 
                      value={zoom} 
                      onChange={(v) => setZoom(v)}
                      className="flex-1"
                      classNames={{ filler: "bg-accent", thumb: "bg-accent" }}
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button variant="flat" className="flex-1 bg-white/10 text-white h-14 rounded-2xl" onPress={() => setShowCropper(false)}>Cancelar</Button>
                    <Button className="flex-1 bg-accent text-black font-black h-14 rounded-2xl" onPress={handleCropConfirm} isLoading={saving}>Confirmar</Button>
                  </div>
                </div>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      </ModalContent>
    </Modal>
  );
}
