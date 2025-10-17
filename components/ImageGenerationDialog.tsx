/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from '@google/genai';
import React, { useState } from 'react';
import { ImageFile } from '../types';
import { XMarkIcon, WandIcon } from './icons';

// This helper function is needed here to process image data from the API.
const base64ToImageFile = async (
  base64: string,
  index: number,
): Promise<ImageFile> => {
  const res = await fetch(`data:image/png;base64,${base64}`);
  const blob = await res.blob();
  const file = new File([blob], `generated-image-${index}.png`, {
    type: 'image/png',
  });
  return {file, base64};
};

type GenerationStatus = 'idle' | 'generating' | 'finished';

type GenerationResult = {
  status: 'pending' | 'success' | 'error';
  data?: ImageFile;
  error?: string;
};

interface ImageGenerationDialogProps {
  initialPrompt: string;
  maxImagesToAdd: number;
  onAddImages: (images: ImageFile[]) => void;
  onImagesGenerated: (images: ImageFile[]) => void;
  onClose: () => void;
}

const ImageGenerationDialog: React.FC<ImageGenerationDialogProps> = ({
  initialPrompt,
  maxImagesToAdd,
  onAddImages,
  onImagesGenerated,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [numberOfImages, setNumberOfImages] = useState(2);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [generationResults, setGenerationResults] = useState<GenerationResult[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setGenerationResults([
        { status: 'error', error: 'Please enter a prompt to generate images.' }
      ]);
      setGenerationStatus('finished');
      return;
    }

    setGenerationStatus('generating');
    setSelectedIndices([]);
    const initialResults: GenerationResult[] = Array(numberOfImages).fill({ status: 'pending' });
    setGenerationResults(initialResults);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePromises = [];

    for (let i = 0; i < numberOfImages; i++) {
        const promise = ai.models
        .generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            responseModalities: [Modality.IMAGE],
          },
        })
        .then(async (response) => {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64ImageBytes: string = part.inlineData.data;
              const imageFile = await base64ToImageFile(base64ImageBytes, i);
              
              setGenerationResults(prev => {
                  const newResults = [...prev];
                  newResults[i] = { status: 'success', data: imageFile };
                  return newResults;
              });
              onImagesGenerated([imageFile]);
              return imageFile;
            }
          }
          throw new Error('No image data returned.');
        }).catch(err => {
           const message = err instanceof Error ? err.message : 'An unknown error occurred.';
           setGenerationResults(prev => {
              const newResults = [...prev];
              newResults[i] = { status: 'error', error: message };
              return newResults;
          });
          // Let Promise.allSettled know about the failure.
          return Promise.reject(err);
        });
      imagePromises.push(promise);
    }
    
    await Promise.allSettled(imagePromises);
    setGenerationStatus('finished');
  };

  const toggleSelection = (index: number) => {
    if (generationResults[index]?.status !== 'success') return;

    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        const successfulImagesCount = generationResults.filter(r => r.status === 'success').length;
        const maxCanSelect = Math.min(maxImagesToAdd, successfulImagesCount);
        if (prev.length < maxCanSelect) {
            return [...prev, index];
        }
        return prev;
      }
    });
  };

  const handleAddSelected = () => {
    const imagesToAdd = selectedIndices
        .map(index => generationResults[index]?.data)
        .filter((img): img is ImageFile => !!img);
    onAddImages(imagesToAdd);
    onClose();
  };

  const renderStatusMessage = () => {
    if (generationStatus !== 'finished') return null;

    const successCount = generationResults.filter(r => r.status === 'success').length;
    const errorCount = generationResults.filter(r => r.status === 'error').length;
    
    // Special case for prompt error
    if (generationResults.length === 1 && errorCount === 1 && successCount === 0) {
        return <p className="text-red-300">{generationResults[0].error}</p>
    }

    if (errorCount === 0 && successCount > 0) {
        return <p className="text-green-400">Successfully generated {successCount} image(s).</p>
    }
    if (successCount > 0 && errorCount > 0) {
        return <p className="text-yellow-400">Generated {successCount} image(s), but {errorCount} failed.</p>
    }
    if (errorCount > 0 && successCount === 0) {
        return <p className="text-red-400">Failed to generate any images.</p>
    }
    return null;
  }

  const successfulImagesCount = generationResults.filter(r => r.status === 'success').length;
  const maxCanSelect = Math.min(maxImagesToAdd, successfulImagesCount);


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
          {generationStatus === 'idle' && (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
              <p>Generated images will appear here.</p>
            </div>
          )}
          {(generationStatus === 'generating' || generationStatus === 'finished') && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generationResults.map((result, index) => {
                const isSelected = selectedIndices.includes(index);
                switch (result.status) {
                  case 'pending':
                    return (
                      <div key={index} className="aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
                      </div>
                    );
                  case 'error':
                    return (
                      <div key={index} title={result.error} className="aspect-square bg-red-900/20 border-2 border-red-500 rounded-lg flex flex-col items-center justify-center p-2 text-center">
                        <XMarkIcon className="w-8 h-8 text-red-400 mb-2" />
                        <p className="text-xs text-red-300">Failed</p>
                      </div>
                    );
                  case 'success':
                    return (
                      <div key={index} className="relative cursor-pointer group" onClick={() => toggleSelection(index)}>
                        <img
                          src={URL.createObjectURL(result.data!.file)}
                          alt={`Generated reference ${index + 1}`}
                          className={`w-full h-full object-cover rounded-lg transition-all duration-200 aspect-square ${isSelected ? 'ring-4 ring-indigo-500' : 'ring-2 ring-transparent group-hover:ring-gray-500'}`}
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
                  default:
                    return null;
                }
              })}
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
              disabled={generationStatus === 'generating'}
            />
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div>
                <label htmlFor="num-images" className="text-xs text-gray-400 block mb-1">Images</label>
                <select
                  id="num-images"
                  value={numberOfImages}
                  onChange={(e) => setNumberOfImages(Number(e.target.value))}
                  className="bg-[#1f1f1f] border border-gray-600 rounded-lg py-2 px-3 focus:ring-1 focus:ring-indigo-500"
                  disabled={generationStatus === 'generating'}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generationStatus === 'generating'}
                className="px-6 py-2.5 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-white font-semibold">
                Generate
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center gap-4">
             <div className="text-sm h-5">
                {renderStatusMessage()}
             </div>
             <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                    {selectedIndices.length} / {maxCanSelect} selected
                </span>
                <button
                onClick={handleAddSelected}
                disabled={selectedIndices.length === 0}
                className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-white font-semibold">
                Add Selected Images
                </button>
             </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ImageGenerationDialog;