import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CoolDialogComponent, OtherDialog } from './dialog';
export const DialogAlias = CoolDialogComponent;
export const DIALOGS = { cool: CoolDialogComponent, other: OtherDialog };
@Injectable({ providedIn: 'root' })
export class DialogLauncher {
  dialog = inject(MatDialog);
  openDirect() { return this.dialog.open(CoolDialogComponent, { data: { title: 'direct' } }); }
  openAlias() { return this.dialog.open(DialogAlias, { data: { title: 'alias' } }); }
  openSelected(key: keyof typeof DIALOGS) { return this.dialog.open(DIALOGS[key]); }
  openOther() { return this.dialog.open(OtherDialog); }
}
