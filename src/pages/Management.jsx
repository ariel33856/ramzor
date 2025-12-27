import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, Plus, Search, User, Phone, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Management() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    email: '',
    type: 'איש קשר',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: () => base44.entities.Person.list('-created_date')
  });

  const createPersonMutation = useMutation({
    mutationFn: (data) => base44.entities.Person.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setDialogOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        id_number: '',
        phone: '',
        email: '',
        type: 'איש קשר',
        notes: ''
      });
    }
  });

  const deletePersonMutation = useMutation({
    mutationFn: (id) => base44.entities.Person.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    }
  });

  const filteredPeople = people.filter(person =>
    person.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.id_number?.includes(searchTerm) ||
    person.phone?.includes(searchTerm)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    createPersonMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-1">
      <div className="w-full">
        {/* Search and Add */}
        <div className="sticky top-[64px] z-20 w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם, ת.ז או טלפון..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-5 h-5 ml-2" />
                  לווה חדש
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>הוסף אדם חדש</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                    <Input
                      value={formData.id_number}
                      onChange={(e) => setFormData({...formData, id_number: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>טלפון</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>אימייל</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
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
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    שמור
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* People List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין אנשים להצגה</h3>
            <p className="text-gray-400">התחל בהוספת אדם חדש</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">שם מלא</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">תעודת זהות</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">טלפון</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">אימייל</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">הערות</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => (
                  <motion.tr
                    key={person.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link 
                        to={createPageUrl('PersonDetails') + `?id=${person.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        {person.first_name} {person.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{person.id_number || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{person.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{person.email || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{person.notes || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePersonMutation.mutate(person.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}