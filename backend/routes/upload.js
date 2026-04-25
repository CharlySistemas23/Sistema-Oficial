import express from 'express';
import { authenticateOptional, requireMasterAdmin } from '../middleware/authOptional.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';

const router = express.Router();

// Solo master_admin / manager pueden borrar fotos. Antes cualquier empleado
// autenticado podia borrar cualquier foto adivinando o leyendo el publicId.
const requireDeleteAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }
  if (req.user.isMasterAdmin) return next();
  const role = (req.user.role || '').toLowerCase();
  if (role === 'admin' || role === 'manager') return next();
  return res.status(403).json({ error: 'Solo administradores y managers pueden borrar imagenes' });
};

// Subir una imagen
router.post('/image', authenticateOptional, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const { folder, publicId } = req.body;
    
    // Subir a Cloudinary
    const result = await uploadImage(req.file.buffer, {
      folder: folder || 'opal-pos',
      publicId: publicId || null
    });

    res.json({
      success: true,
      image: {
        url: result.url,
        thumbnail_url: result.thumbnail_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      }
    });
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    res.status(500).json({ error: error.message || 'Error al subir imagen' });
  }
});

// Subir archivo (genérico - PDF, DOC, etc.)
router.post('/file', authenticateOptional, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const { folder } = req.body;
    
    // Si es imagen, subir a Cloudinary
    if (req.file.mimetype.startsWith('image/')) {
      const result = await uploadImage(req.file.buffer, {
        folder: folder || 'opal-pos',
        publicId: null
      });

      return res.json({
        success: true,
        url: result.url,
        thumbnail_url: result.thumbnail_url,
        public_id: result.public_id,
        file_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      });
    }

    // Para otros archivos (PDF, DOC, etc.), guardar localmente o en Cloudinary según configuración
    // Por ahora, retornar URL local temporal (en producción usar Cloudinary o S3)
    const fileUrl = `/uploads/${folder || 'files'}/${req.file.filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      file_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    });
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    res.status(500).json({ error: error.message || 'Error al subir archivo' });
  }
});

// Subir múltiples imágenes
router.post('/images', authenticateOptional, uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    const { folder } = req.body;
    const uploadResults = [];

    // Subir cada imagen
    for (const file of req.files) {
      try {
        const result = await uploadImage(file.buffer, {
          folder: folder || 'opal-pos'
        });
        uploadResults.push({
          url: result.url,
          thumbnail_url: result.thumbnail_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes
        });
      } catch (error) {
        console.error('Error subiendo imagen individual:', error);
        uploadResults.push({
          error: error.message,
          filename: file.originalname
        });
      }
    }

    res.json({
      success: true,
      images: uploadResults,
      total: uploadResults.length,
      successful: uploadResults.filter(img => !img.error).length,
      failed: uploadResults.filter(img => img.error).length
    });
  } catch (error) {
    console.error('Error subiendo imágenes:', error);
    res.status(500).json({ error: error.message || 'Error al subir imágenes' });
  }
});

// Eliminar imagen (solo admin/manager — antes cualquier empleado podia borrar)
router.delete('/image/:publicId', authenticateOptional, requireDeleteAccess, async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID requerido' });
    }

    const result = await deleteImage(publicId);

    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar imagen' });
  }
});

export default router;
