import React from "react";
import {
  List as MuiList,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  ListSubheader,
  Divider,
} from "@mui/material";

const List = React.forwardRef(
  (
    {
      children,
      items = [],
      dense = false,
      disablePadding = false,
      subheader,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiList
        ref={ref}
        dense={dense}
        disablePadding={disablePadding}
        subheader={subheader}
        sx={sx}
        {...props}
      >
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <ListItem disablePadding={item.disablePadding}>
              <ListItemButton onClick={item.onClick} disabled={item.disabled}>
                {item.avatar && <ListItemAvatar>{item.avatar}</ListItemAvatar>}
                {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                <ListItemText
                  primary={item.primary}
                  secondary={item.secondary}
                />
                {item.action}
              </ListItemButton>
            </ListItem>
            {item.divider && <Divider />}
          </React.Fragment>
        ))}
        {children}
      </MuiList>
    );
  }
);

List.displayName = "List";

export default List;
