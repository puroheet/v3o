/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { ImageFile } from '../types';
import { XMarkIcon, PhotoIcon } from './icons';

interface ImageGalleryDialogProps {
  images: ImageFile[];
  maxSelectable: number;
  onAddImages: (images: ImageFile[]) => void;
  onClose: () => void;
}

const ImageGalleryDialog: React.FC<ImageGalleryDialogProps> = ({
  images,
  maxSelectable,
  onAddImages,
  onClose,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const toggleSelection = (index: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        if (prev.length < maxSelectable) {
          return [...prev, index];
        }
        return prev;
      }
    });
  };

  const handleAddSelected = () => {
    const imagesToAdd = selectedIndices.map((index) => images[index]);
    onAddImages(imagesToAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col h-[90vh]">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PhotoIcon className="w-6 h-6 text-purple-400" />
            Select from Image Gallery
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow p-4 overflow-y-auto">
          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => {
                const isSelected = selectedIndices.includes(index);
                return (
                  <div
                    key={index}
                    className="relative cursor-pointer group"
                    onClick={() => toggleSelection(index)}
                  >
                    <img
                      src={URL.createObjectURL(image.file)}
                      alt={`Gallery image ${index + 1}`}
                      className={`w-full h-full object-cover rounded-lg transition-all duration-200 ${
                        isSelected
                          ? 'ring-4 ring-indigo-500'
                          : 'ring-2 ring-transparent group-hover:ring-gray-500'
                      }`}
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
              <p>Your image gallery is empty.
                <br />
                Use the 'Generate' button to create new images.
              </p>
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-end items-center gap-4">
          <span className="text-sm text-gray-400">
            {selectedIndices.length} / {maxSelectable} selected
          </span>
          <button
            onClick={handleAddSelected}
            disabled={selectedIndices.length === 0}
            className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-white font-semibold"
          >
            Add Selected Images
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ImageGalleryDialog;
