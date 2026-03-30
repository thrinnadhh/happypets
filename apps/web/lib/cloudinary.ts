/**
 * Cloudinary Integration
 * Image upload and deletion with transformations
 */

import { v2 as cloudinary } from 'cloudinary';
import { getLogger } from '@/lib/logger';

const logger = getLogger('cloudinary');

if (
  !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error('Cloudinary credentials not configured');
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param dataUri - Base64 data URI or file path
 * @param folder - Folder path in Cloudinary
 * @returns Optimized image URL
 */
export const uploadToCloudinary = async (
  dataUri: string,
  folder: string
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [
        {
          width: 800,
          height: 800,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
    });

    logger.info(`Image uploaded: ${result.public_id}`);
    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Image deleted: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};

/**
 * Get optimized image URL with transformations
 * @param publicId - Public ID of the image
 * @param width - Image width (optional)
 * @param height - Image height (optional)
 */
export const getOptimizedImageUrl = (
  publicId: string,
  width?: number,
  height?: number
): string => {
  const transformations = [];

  if (width || height) {
    transformations.push({
      width: width || 'auto',
      height: height || 'auto',
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }

  return cloudinary.url(publicId, {
    transformation: transformations,
    quality: 'auto',
    fetch_format: 'auto',
  });
};

export default cloudinary;
