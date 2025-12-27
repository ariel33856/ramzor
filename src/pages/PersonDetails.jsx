import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, Phone, Mail, IdCard, FileText, Loader2, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PersonDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => base44.entities.Person.filter({ id: personId }).then(res => res[0]),
    enabled: !!personId
  });

  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (person) {
      setFormData({
        first_name: person.first_name || '',
        last_name: person.last_name || '',
        id_number: person.id_number || '',
        phone: person.phone || '',
        email: person.email || '',
        type: person.type || 'איש קשר',
        notes: person.notes || ''
      });
    }
  }, [person]);

  const updatePersonMutation = useMutation({
    mutationFn: (data) => base44.entities.Person.update(personId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updatePersonMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">אדם לא נמצא</h2>
          <Link to={createPageUrl('Management')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה לרשימה
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-1">
      <div className="w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {person.first_name} {person.last_name}
                </h1>
                <p className="text-gray-500">{person.type}</p>
              </div>
            </div>
            <Link to={createPageUrl('Management')}>
              <Button variant="outline">
                <ArrowRight className="w-4 h-4 ml-2" />
                חזרה לרשימה
              </Button>
            </Link>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>שם פרטי *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>שם משפחה *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <Label>תעודת זהות</Label>
              <div className="relative">
                <IdCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={formData.id_number}
                  onChange={(e) => setFormData({...formData, id_number: e.target.value})}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>טלפון</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="pr-10"
                  />
                </div>
              </div>
              <div>
                <Label>אימייל</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="pr-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>סוג</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="לווה">לווה</SelectItem>
                  <SelectItem value="ערב">ערב</SelectItem>
                  <SelectItem value="איש קשר">איש קשר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={updatePersonMutation.isPending}
            >
              {updatePersonMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 ml-2" />
                  שמור שינויים
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}