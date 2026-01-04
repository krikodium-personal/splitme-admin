
import React from 'react';
import { NutritionalTable } from '../types';

interface NutritionInputProps {
  data: NutritionalTable;
  onChange: (data: NutritionalTable) => void;
}

const NutritionInput: React.FC<NutritionInputProps> = ({ data, onChange }) => {
  const fields: { key: keyof NutritionalTable; label: string; unit: string }[] = [
    { key: 'calories', label: 'Calorías', unit: 'kcal' },
    { key: 'protein_g', label: 'Proteína', unit: 'g' },
    { key: 'total_fat_g', label: 'Grasas Totales', unit: 'g' },
    { key: 'sat_fat_g', label: 'Grasas Sat.', unit: 'g' },
    { key: 'carbs_g', label: 'Carbohidratos', unit: 'g' },
    { key: 'sugars_g', label: 'Azúcares', unit: 'g' },
    { key: 'fiber_g', label: 'Fibra', unit: 'g' },
    { key: 'sodium_mg', label: 'Sodio', unit: 'mg' },
  ];

  const handleInputChange = (key: keyof NutritionalTable, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    onChange({
      ...data,
      [key]: isNaN(numValue) ? 0 : numValue
    });
  };

  return (
    <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Información Nutricional</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter">{field.label}</label>
            <div className="relative group">
              <input
                type="number"
                value={data[field.key] || ''}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 group-focus-within:text-indigo-400">
                {field.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NutritionInput;
