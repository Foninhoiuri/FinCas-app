import { Navbar, NavbarBrand } from "@heroui/react";
import GlobalUserMenu from './GlobalUserMenu';

export default function Header() {
  return (
    <Navbar 
      maxWidth="full"
      className="bg-surface-950/70 backdrop-blur-md border-b border-white/5 fixed top-0 z-50 md:hidden"
      height="4rem"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavbarBrand>
        <div className="w-3 h-3 bg-success rounded-full mr-2 shadow-[0_0_10px_#17c964]"></div>
        <p className="font-bold text-white tracking-tight text-xl">
          Fin<span className="text-success">Cas</span>
        </p>
      </NavbarBrand>
      
      {/* Avatar removido do mobile por solicitação */}
    </Navbar>
  );
}
