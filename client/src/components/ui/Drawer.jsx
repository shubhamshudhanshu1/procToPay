import React from "react";
import {
  Drawer as MuiDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";

const Drawer = React.forwardRef(
  (
    {
      children,
      open,
      onClose,
      variant = "temporary",
      anchor = "left",
      width = 240,
      items = [],
      sx,
      ...props
    },
    ref
  ) => {
    const drawerContent = (
      <Box sx={{ width: width }}>
        {items.length > 0 && (
          <List>
            {items.map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={item.onClick}>
                  {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
        {children}
      </Box>
    );

    return (
      <MuiDrawer
        ref={ref}
        variant={variant}
        anchor={anchor}
        open={open}
        onClose={onClose}
        sx={sx}
        {...props}
      >
        {drawerContent}
      </MuiDrawer>
    );
  }
);

Drawer.displayName = "Drawer";

export default Drawer;
