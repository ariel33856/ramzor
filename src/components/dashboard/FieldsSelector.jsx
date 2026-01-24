import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { mainGroups, tabComponents } from './FieldsHierarchy';
import { tabs } from '@/components/CaseTabs';

export default function FieldsSelector({ selectedFields, onFieldToggle }) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedTabs, setExpandedTabs] = useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleTab = (tabId) => {
    setExpandedTabs(prev => ({ ...prev, [tabId]: !prev[tabId] }));
  };

  const isFieldSelected = (fieldId) => {
    return selectedFields.includes(fieldId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg">
          <ChevronDown className="w-4 h-4" />
          בחר שדות להצגה
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 min-h-[150px] max-h-[600px] overflow-y-auto">
        <button
          onClick={() => document.querySelector('[data-radix-popper-content-wrapper]')?.click()}
          className="absolute top-2 left-2 p-1.5 rounded-full hover:bg-red-100 bg-red-50 transition-colors z-50 shadow-sm"
        >
          <X className="w-5 h-5 text-red-600 font-bold" />
        </button>
        <div className="space-y-2 pt-6">
          <h4 className="font-semibold text-sm mb-4">בחר שדות להצגה בטבלה</h4>
          
          {mainGroups.map(group => {
            const groupTabs = tabs.filter(tab => group.tabIds.includes(tab.id));
            const isGroupExpanded = expandedGroups[group.id];
            
            return (
              <div key={group.id} className="border rounded-lg overflow-hidden">
                {/* קבוצה ראשית */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full px-3 py-2 flex items-center justify-between bg-${group.color}-50 hover:bg-${group.color}-100 transition-colors`}
                >
                  <span className="font-semibold text-sm">{group.label}</span>
                  {isGroupExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>

                {/* כרטיסיות */}
                {isGroupExpanded && (
                  <div className="bg-white">
                    {groupTabs.map(tab => {
                      const components = tabComponents[tab.id] || [];
                      const isTabExpanded = expandedTabs[tab.id];
                      
                      if (components.length === 0) return null;
                      
                      return (
                        <div key={tab.id} className="border-t">
                          <button
                            onClick={() => toggleTab(tab.id)}
                            className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {React.createElement(tab.icon, { className: "w-4 h-4" })}
                              <span className="text-sm">{tab.label}</span>
                            </div>
                            {isTabExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronLeft className="w-3 h-3" />
                            )}
                          </button>

                          {/* שדות */}
                          {isTabExpanded && (
                            <div className="bg-white">
                              {components.map(component => (
                                component.fields.map(field => (
                                  <div
                                    key={field.id}
                                    className="px-8 py-2 flex items-center gap-2 hover:bg-blue-50 transition-colors border-t border-gray-100"
                                  >
                                    <Checkbox
                                      id={`field-${field.id}`}
                                      checked={isFieldSelected(field.id)}
                                      onCheckedChange={() => onFieldToggle(field.id)}
                                    />
                                    <label
                                      htmlFor={`field-${field.id}`}
                                      className="text-sm cursor-pointer flex-1"
                                    >
                                      {field.label}
                                    </label>
                                  </div>
                                ))
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}