/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { ImageFile } from '../types';
import { generateImages } from '../services/geminiService';
import { XMarkIcon, WandIcon } from './icons';

const MiniLoadingIndicator: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 border-4 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-300">Generating images...</p>
    </div>
);


interface ImageGenerationDialogProps {
  initialPrompt: string;
  maxImagesToAdd: number;
  onAddImages: (images: ImageFile[]) => void;
  onClose: () => void;
}

const ImageGenerationDialog: React.FC<ImageGenerationDialogProps> = ({
  initialPrompt,
  maxImagesToAdd,
  onAddImages,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [numberOfImages, setNumberOfImages] = useState(2);
  const [generatedImages, setGeneratedImages] = useState<ImageFile[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedIndices([]);

    try {
      const images = await generateImages(prompt, numberOfImages);
      setGeneratedImages(images);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate images: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        if (prev.length < maxImagesToAdd) {
            return [...prev, index];
        }
        return prev;
      }
    });
  };

  const handleAddSelected = () => {
    const imagesToAdd = selectedIndices.map(index => generatedImages[index]);
    onAddImages(imagesToAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col h-[90vh]">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <WandIcon className="w-6 h-6 text-indigo-400" />
            Generate Reference Images
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow p-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <MiniLoadingIndicator />
            </div>
          ) : error ? (
            <div className="text-center bg-red-900/20 border border-red-500 p-4 rounded-lg">
              <p className="text-red-300">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generatedImages.map((image, index) => {
                const isSelected = selectedIndices.includes(index);
                return (
                  <div key={index} className="relative cursor-pointer group" onClick={() => toggleSelection(index)}>
                    <img
                      src={URL.createObjectURL(image.file)}
                      alt={`Generated reference ${index + 1}`}
                      className={`w-full h-full object-cover rounded-lg transition-all duration-200 ${isSelected ? 'ring-4 ring-indigo-500' : 'ring-2 ring-transparent group-hover:ring-gray-500'}`}
                    />
                    {isSelected && (
                       <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                       </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
           { !isLoading && generatedImages.length === 0 && !error && (
             <div className="flex items-center justify-center h-full text-center text-gray-500">
                <p>Generated images will appear here.</p>
             </div>
           )}
        </div>

        <footer className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the images to generate..."
              className="flex-grow w-full bg-[#1f1f1f] border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2}
            />
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div>
                <label htmlFor="num-images" className="text-xs text-gray-400 block mb-1">Images</label>
                <select
                    id="num-images"
                    value={numberOfImages}
                    onChange={(e) => setNumberOfImages(Number(e.target.value))}
                    className="bg-[#1f1f1f] border border-gray-600 rounded-lg py-2 px-3 focus:ring-1 focus:ring-indigo-500"
                    >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-6 py-2.5 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-white font-semibold">
                Generate
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-end items-center gap-4">
             <span className="text-sm text-gray-400">
                {selectedIndices.length} / {maxImagesToAdd} selected
             </span>
            <button
              onClick={handleAddSelected}
              disabled={selectedIndices.length === 0}
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-white font-semibold">
              Add Selected Images
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ImageGenerationDialog;
