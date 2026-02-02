import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Home, MapPin, Phone, User, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PropertyDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.PropertyAsset.filter({ id: propertyId }).then(res => res[0]),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000
  });

  const { data: linkedCase } = useQuery({
    queryKey: ['linked-case', property?.case_id],
    queryFn: () => base44.entities.MortgageCase.filter({ id: property.case_id }).then(res => res[0]),
    enabled: !!property?.case_id,
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-16">
        <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">נכס לא נמצא</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-0 h-full">
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 border-b border-teal-200">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Home className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{property.address}</h1>
            <div className="flex items-center gap-2 text-gray-600 text-lg mb-4">
              <MapPin className="w-5 h-5" />
              <span>{property.city}</span>
              <span className="mx-3">•</span>
              <span className="font-semibold">{property.property_type}</span>
            </div>
            {linkedCase && (
              <button 
                onClick={() => navigate(createPageUrl('CaseAccount') + `?id=${linkedCase.id}`)}
                className="inline-block px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer"
              >
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">משויך לחשבון:</span> {linkedCase.client_name} {linkedCase.last_name || ''} (מס׳ {linkedCase.account_number})
                </p>
              </button>
            )}
          </div>
          {property.status && (
            <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              property.status === 'פנוי' ? 'bg-green-100 text-green-800' :
              property.status === 'תפוס' ? 'bg-gray-100 text-gray-800' :
              property.status === 'להשכרה' ? 'bg-blue-100 text-blue-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {property.status}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-8">
        {/* Physical Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6">פרטים פיזיים</h3>
          <div className="space-y-4">
            {property.size_sqm && (
              <div className="pb-4 border-b border-gray-100">
                <p className="text-sm text-gray-500 mb-1">שטח</p>
                <p className="text-2xl font-bold text-gray-900">{property.size_sqm} <span className="text-lg text-gray-600">מ"ר</span></p>
              </div>
            )}
            {property.rooms && (
              <div className="pb-4 border-b border-gray-100">
                <p className="text-sm text-gray-500 mb-1">מספר חדרים</p>
                <p className="text-2xl font-bold text-gray-900">{property.rooms}</p>
              </div>
            )}
            {property.floor !== undefined && property.floor !== null && (
              <div className="pb-4 border-b border-gray-100">
                <p className="text-sm text-gray-500 mb-1">קומה</p>
                <p className="text-2xl font-bold text-gray-900">{property.floor}</p>
              </div>
            )}
            {property.price && (
              <div>
                <p className="text-sm text-gray-500 mb-1">מחיר</p>
                <p className="text-2xl font-bold text-gray-900">₪<span className="text-gray-600">{parseInt(property.price).toLocaleString()}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Owner Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6">פרטי בעלים</h3>
          <div className="space-y-4">
            {property.owner_name && (
              <div className="pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-1">
                  <User className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-500">שם בעלים</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">{property.owner_name}</p>
              </div>
            )}
            {property.owner_phone && (
              <div className="pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-1">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-500">טלפון בעלים</p>
                </div>
                <p className="text-lg font-semibold text-gray-900 dir-ltr">{property.owner_phone}</p>
              </div>
            )}
            {!property.owner_name && !property.owner_phone && (
              <p className="text-gray-400 italic">אין פרטי בעלים</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {property.notes && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mx-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-bold text-gray-900">הערות</h3>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{property.notes}</p>
        </div>
      )}
    </div>
  );
}