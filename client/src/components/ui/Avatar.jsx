import React from "react";
import { Avatar as MuiAvatar } from "@mui/material";

const Avatar = React.forwardRef(
  ({ src, alt, children, variant = "circular", sizes, sx, ...props }, ref) => {
    return (
      <MuiAvatar
        ref={ref}
        src={src}
        alt={alt}
        variant={variant}
        sizes={sizes}
        sx={sx}
        {...props}
      >
        {children}
      </MuiAvatar>
    );
  }
);

Avatar.displayName = "Avatar";

export default Avatar;
