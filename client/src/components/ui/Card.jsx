import React from "react";
import {
  Card as MuiCard,
  CardContent,
  CardActions,
  CardHeader,
  CardMedia,
} from "@mui/material";

const Card = React.forwardRef(
  (
    {
      children,
      title,
      subtitle,
      avatar,
      action,
      media,
      mediaHeight,
      actions,
      content,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiCard ref={ref} sx={sx} {...props}>
        {(title || subtitle || avatar || action) && (
          <CardHeader
            title={title}
            subheader={subtitle}
            avatar={avatar}
            action={action}
          />
        )}
        {media && (
          <CardMedia
            component="img"
            height={mediaHeight || 140}
            image={media}
            alt={title || "Card media"}
          />
        )}
        {content && <CardContent>{content}</CardContent>}
        {children && <CardContent>{children}</CardContent>}
        {actions && <CardActions>{actions}</CardActions>}
      </MuiCard>
    );
  }
);

Card.displayName = "Card";

export default Card;
