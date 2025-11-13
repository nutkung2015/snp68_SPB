const cloudinary = require('../config/cloudinary');

exports.uploadImages = async (images) => {
  if (!images || images.length === 0) return [];
  
  try {
    const uploadPromises = images.map(image => 
      cloudinary.uploader.upload(image, {
        folder: 'repairs',
      })
    );
    
    const results = await Promise.all(uploadPromises);
    return results.map(result => result.secure_url);
  } catch (error) {
    console.error('Error uploading images:', error);
    throw error;
  }
};
