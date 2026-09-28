import React from 'react';

/**
 * The icon set is Material Symbols Rounded, subsetted to these names in
 * index.html. A name that is not in that list renders blank, so the two have
 * to be changed together.
 */
export type IconName =
  | 'add'
  | 'add_photo_alternate'
  | 'arrow_back'
  | 'arrow_forward'
  | 'arrow_outward'
  | 'block'
  | 'bookmark'
  | 'build'
  | 'calendar_today'
  | 'campaign'
  | 'cancel'
  | 'check'
  | 'check_circle'
  | 'chevron_left'
  | 'chevron_right'
  | 'close'
  | 'compare_arrows'
  | 'content_copy'
  | 'content_cut'
  | 'dark_mode'
  | 'data_object'
  | 'delete'
  | 'description'
  | 'dns'
  | 'done_all'
  | 'download'
  | 'draft'
  | 'edit'
  | 'edit_note'
  | 'error'
  | 'expand_more'
  | 'explore'
  | 'grid_view'
  | 'group'
  | 'gpp_maybe'
  | 'home'
  | 'image'
  | 'info'
  | 'inventory_2'
  | 'key'
  | 'laptop'
  | 'light_mode'
  | 'link'
  | 'local_fire_department'
  | 'lock'
  | 'login'
  | 'logout'
  | 'menu'
  | 'monitoring'
  | 'notifications'
  | 'open_in_new'
  | 'person'
  | 'person_add'
  | 'progress_activity'
  | 'refresh'
  | 'restart_alt'
  | 'save'
  | 'schedule'
  | 'search'
  | 'sell'
  | 'settings'
  | 'shield'
  | 'sort'
  | 'speed'
  | 'storage'
  | 'swap_horiz'
  | 'table_chart'
  | 'terminal'
  | 'trending_up'
  | 'tune'
  | 'upload'
  | 'verified_user'
  | 'view_column'
  | 'view_list'
  | 'visibility'
  | 'warning'
  | 'webhook';

interface IconProps {
  name: IconName;
  /** Solid variant. FILL is a font axis, so this switches weight, not opacity. */
  filled?: boolean;
  className?: string;
}

/**
 * Icons here are decoration: the control around them carries the accessible
 * name, so the glyph is aria-hidden and the name reaches the DOM only as a
 * class (see the .i-* content rules in index.css).
 */
export const Icon: React.FC<IconProps> = ({ name, filled = false, className }) => {
  const classes = ['icon', `i-${name}`, filled && 'icon-filled', className]
    .filter(Boolean)
    .join(' ');
  return <span className={classes} aria-hidden="true" />;
};
