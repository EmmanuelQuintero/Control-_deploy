import { ProfileView } from "@/components/profile-view";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user } = useAuth();
  const { updateUser } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    edad: user?.edad?.toString() || '',
    sexo: user?.sexo || '',
    peso: user?.peso?.toString() || '',
    altura: user?.altura?.toString() || '',
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload: any = {};
    for (const k of Object.keys(form) as (keyof typeof form)[]) {
      if (form[k] !== '' && form[k] !== (user as any)[k]) {
        if (['edad','peso','altura'].includes(k)) {
          const num = Number(form[k]);
            if (!Number.isNaN(num)) payload[k] = num; else continue;
        } else {
          payload[k] = form[k];
        }
      }
    }
    const ok = await updateUser(payload);
    setSaving(false);
    if (ok) {
      toast({ title: 'Perfil actualizado', description: 'Los cambios fueron guardados.' });
      setEditing(false);
    } else {
      toast({ title: 'Error', description: 'No se pudo actualizar el perfil', variant: 'destructive' });
    }
  };

  const profile = {
    firstName: user?.nombre || "—",
    lastName: user?.apellido || "",
    email: user?.email || "—",
    age: user?.edad ?? 0,
    sex: (user?.sexo || '—').toLowerCase(),
    weight: user?.peso ? Number(user.peso) : 0,
    height: user?.altura ? Number(user.altura) : 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>
      
      {!editing && (
          <ProfileView profile={profile} onEdit={() => setEditing(true)} />
      )}
      {editing && (
        <div className="space-y-4" data-testid="form-edit-profile">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input name="nombre" value={form.nombre} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm font-medium">Apellido</label>
              <Input name="apellido" value={form.apellido} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" value={form.email} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm font-medium">Edad</label>
              <Input name="edad" type="number" value={form.edad} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm font-medium">Sexo</label>
              <Input name="sexo" value={form.sexo} onChange={onChange} placeholder="Hombre / Mujer / Otro" />
            </div>
            <div>
              <label className="text-sm font-medium">Peso (kg)</label>
              <Input name="peso" type="number" step="0.01" value={form.peso} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm font-medium">Altura (cm)</label>
              <Input name="altura" type="number" step="0.1" value={form.altura} onChange={onChange} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            <Button variant="outline" onClick={() => { setEditing(false); setForm({
              nombre: user?.nombre || '',
              apellido: user?.apellido || '',
              email: user?.email || '',
              edad: user?.edad?.toString() || '',
              sexo: user?.sexo || '',
              peso: user?.peso?.toString() || '',
              altura: user?.altura?.toString() || '',
            }); }}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
