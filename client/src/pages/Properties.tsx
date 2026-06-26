import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Property } from '../lib/types';
import { num } from '../lib/format';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
} from '../components/ui';

const PROPERTY_TYPES = ['Office', 'Retail', 'Industrial', 'Warehouse', 'Land'];
const STATUSES = ['Active', 'Under Review', 'Disposed'];

const EMPTY: Partial<Property> = {
  name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  lat: 39.5,
  lng: -98.35,
  property_type: 'Office',
  rentable_sqft: 0,
  status: 'Active',
  market: '',
};

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Property> | null>(null);

  const load = () =>
    api.properties().then((p) => {
      setProperties(p);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  async function save(form: Partial<Property>) {
    if (form.id) await api.updateProperty(form.id, form);
    else await api.createProperty(form);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this property and its leases?')) return;
    await api.deleteProperty(id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-sm text-slate-500">{properties.length} sites in the portfolio</p>
        </div>
        <Button onClick={() => setEditing(EMPTY)}>+ Add Property</Button>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Rentable SF</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-5 py-3 text-slate-600">
                  {p.city}, {p.state}
                  <div className="text-xs text-slate-400">{p.market}</div>
                </td>
                <td className="px-5 py-3">
                  <Badge>{p.property_type}</Badge>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                  {num(p.rentable_sqft)}
                </td>
                <td className="px-5 py-3">
                  <Badge>{p.status}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    className="mr-3 text-xs font-medium text-blue-600 hover:underline"
                    onClick={() => setEditing(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs font-medium text-rose-600 hover:underline"
                    onClick={() => remove(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editing && (
        <PropertyForm
          initial={editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PropertyForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<Property>;
  onSave: (p: Partial<Property>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Property>>(initial);
  const set = (k: keyof Property, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={form.id ? 'Edit Property' : 'Add Property'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <Field label="Property Name">
          <Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Address">
          <Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City">
            <Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="State">
            <Input value={form.state || ''} onChange={(e) => set('state', e.target.value)} />
          </Field>
          <Field label="Zip">
            <Input value={form.zip || ''} onChange={(e) => set('zip', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <Input
              type="number"
              step="any"
              value={form.lat ?? ''}
              onChange={(e) => set('lat', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="any"
              value={form.lng ?? ''}
              onChange={(e) => set('lng', parseFloat(e.target.value))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Property Type">
            <Select
              value={form.property_type}
              onChange={(e) => set('property_type', e.target.value)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Rentable Sq Ft">
            <Input
              type="number"
              value={form.rentable_sqft ?? 0}
              onChange={(e) => set('rentable_sqft', parseInt(e.target.value || '0'))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Market">
            <Input value={form.market || ''} onChange={(e) => set('market', e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
