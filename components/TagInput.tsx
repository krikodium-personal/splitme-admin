
import React, { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  variant: 'indigo' | 'rose';
}

const TagInput: React.FC<TagInputProps> = ({ label, placeholder, tags, onChange, variant }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) {
        onChange([...tags, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const baseColor = variant === 'indigo' ? 'indigo' : 'rose';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-${baseColor}-500 focus:border-transparent outline-none transition-all pr-12`}
        />
        <button 
          type="button"
          onClick={() => {
            if (inputValue.trim()) {
               if (!tags.includes(inputValue.trim())) onChange([...tags, inputValue.trim()]);
               setInputValue('');
            }
          }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-${baseColor}-50 text-${baseColor}-600 rounded-lg hover:bg-${baseColor}-100 transition-colors`}
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-3">
        {tags.map((tag, index) => (
          <span 
            key={index}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium animate-in zoom-in-95 duration-200 ${
              variant === 'indigo' 
                ? 'bg-indigo-50 text-indigo-700' 
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            <span>{tag}</span>
            <button 
              type="button" 
              onClick={() => removeTag(index)}
              className="hover:bg-white rounded-full p-0.5 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <p className="text-xs text-gray-400 italic py-1">No se han añadido elementos aún</p>
        )}
      </div>
    </div>
  );
};

export default TagInput;
