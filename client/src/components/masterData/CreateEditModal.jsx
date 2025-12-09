import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  MenuItem,
} from '@mui/material';
import { Close } from '@mui/icons-material';

const CreateEditModal = ({ open, onClose, onSuccess, type, data = null, brands = [], categories = [] }) => {
  const isEdit = !!data;
  const isProduct = type === 'product';

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    ...(isProduct && { brandCode: '', categoryCode: '', price: '' }),
  });

  useEffect(() => {
    if (open) {
      if (data) {
        setFormData({
          name: data.name || '',
          code: data.code || '',
          description: data.description || '',
          ...(isProduct && {
            brandCode: data.brand?.code || '',
            categoryCode: data.category?.code || '',
            price: data.price || '',
          }),
        });
      } else {
        setFormData({
          name: '',
          code: '',
          description: '',
          ...(isProduct && { brandCode: '', categoryCode: '', price: '' }),
        });
      }
    }
  }, [data, open, isProduct]);

  const handleSubmit = () => {
    if (!formData.name || !formData.code) {
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} Name and Code are required.`);
      return;
    }

    if (isProduct && (!formData.brandCode || !formData.categoryCode)) {
      alert('Brand Code and Category Code are required for products.');
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description?.trim() || null,
      ...(isProduct && {
        brandCode: formData.brandCode.trim().toUpperCase(),
        categoryCode: formData.categoryCode.trim().toUpperCase(),
        price: formData.price ? parseFloat(formData.price) : null,
      }),
    };

    onSuccess(submitData);
  };

  const handleClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  const title = isEdit ? `Edit ${type}` : `Add ${type}`;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />

          <TextField
            label="Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            fullWidth
            helperText="Uppercase letters, numbers, and underscores only"
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />

          {isProduct && (
            <>
              <TextField
                select
                label="Brand Code"
                value={formData.brandCode}
                onChange={(e) => setFormData({ ...formData, brandCode: e.target.value })}
                required
                fullWidth
              >
                {brands.map((brand) => (
                  <MenuItem key={brand.id} value={brand.code}>
                    {brand.code} - {brand.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Category Code"
                value={formData.categoryCode}
                onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
                required
                fullWidth
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.code}>
                    {category.code} - {category.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!formData.name || !formData.code}>
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateEditModal;

