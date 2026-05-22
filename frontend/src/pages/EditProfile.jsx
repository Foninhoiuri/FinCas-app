import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { ChevronLeft, Camera, Check, AlertCircle, User as UserIcon, X, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Button, Input, Card, CardBody, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Slider, Spinner } from "@heroui/react";

// Gera o blob da imagem recortada
async function getCroppedImg(imageSrc, crop) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const size = 512; // Aumentado para melhor qualidade
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, size, size,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
  });
}

const avatarColors = {
  Igor: 'from-indigo-500 to-purple-600',
  Flávia: 'from-pink-500 to-rose-600',
};

export default function EditProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [nickname, setNickname] = useState(user?.nickname || '');

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

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

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedArea(areaPixels);
  }, []);

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
      const updatedUser = await api.updateProfile(user.id, { name, email, nickname });
      login({ ...user, ...updatedUser });
      setFeedback({ msg: 'Perfil salvo!', ok: true });
    } catch (err) {
      setFeedback({ msg: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button isIconOnly variant="flat" size="sm" className="bg-white/5 border border-white/10 rounded-xl" onPress={() => navigate('/profile')}>
          <ChevronLeft size={18} className="text-white/50" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Meu Perfil</h1>
          <p className="text-sm text-white/40">Edite suas informações e foto de perfil</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Avatar Sidebar */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/5 relative">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${avatarColors[user?.name] || 'from-surface-700 to-surface-800'} flex items-center justify-center`}>
                  <UserIcon size={48} className="text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <Button isIconOnly variant="light" size="lg" onPress={() => fileRef.current?.click()} className="text-white">
                  <Camera size={24} />
                </Button>
              </div>
            </div>
            <Button 
              isIconOnly 
              size="sm" 
              className="absolute -bottom-2 -right-2 bg-accent text-black rounded-xl shadow-lg glow-accent"
              onPress={() => fileRef.current?.click()}
            >
              <Camera size={14} />
            </Button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
          <p className="text-[10px] text-white/20 uppercase tracking-widest font-black text-center">Clique na foto para trocar</p>
        </div>

        {/* Form Fields */}
        <Card className="md:col-span-2 bg-surface-900 border border-white/5 shadow-xl">
          <CardBody className="p-6 gap-6">
            <Input 
              label="Nome Completo"
              value={name}
              onValueChange={setName}
              placeholder="Digite seu nome"
              classNames={{ inputWrapper: "bg-white/5 border border-white/10 h-12 rounded-2xl" }}
            />
            <Input 
              label="E-mail"
              type="email"
              value={email}
              onValueChange={setEmail}
              placeholder="seu@email.com"
              classNames={{ inputWrapper: "bg-white/5 border border-white/10 h-12 rounded-2xl" }}
            />
            <Input 
              label="Como quer ser chamado?"
              value={nickname}
              onValueChange={setNickname}
              placeholder="Ex: Igão"
              classNames={{ inputWrapper: "bg-white/5 border border-white/10 h-12 rounded-2xl" }}
            />

            {feedback && (
              <div className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl animate-fade-in ${feedback.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {feedback.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                {feedback.msg}
              </div>
            )}

            <Button 
              fullWidth 
              color="primary" 
              onPress={handleSaveProfile} 
              isLoading={saving}
              className="bg-gradient-to-r from-accent to-accent-dark text-black font-bold uppercase tracking-widest h-12 rounded-2xl shadow-lg shadow-accent/20 mt-2"
            >
              Salvar Alterações
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Cropper Modal */}
      <Modal 
        isOpen={showCropper} 
        onClose={() => setShowCropper(false)} 
        size="2xl" 
        placement="center" 
        backdrop="blur"
        classNames={{ base: "bg-black border border-white/10 rounded-3xl", header: "border-b border-white/5" }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Ajustar Foto de Perfil</ModalHeader>
          <ModalBody className="p-0 bg-zinc-950">
            <div className="relative w-full h-[400px] bg-black overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-6 flex items-center gap-4 bg-surface-900 border-t border-white/5">
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
          </ModalBody>
          <ModalFooter className="bg-surface-900">
            <Button variant="light" className="text-white/40" onPress={() => setShowCropper(false)}>Cancelar</Button>
            <Button 
              className="bg-accent text-black font-bold px-8 rounded-xl shadow-lg shadow-accent/20"
              onPress={handleCropConfirm}
              isLoading={saving}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
