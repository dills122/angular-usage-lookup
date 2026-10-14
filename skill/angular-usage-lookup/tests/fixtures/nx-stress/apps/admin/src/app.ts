import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CoolDialogComponent as AdminDialog, DIALOGS } from '@stress/dialogs';
@Component({ selector: 'admin-root', standalone: false, templateUrl: './dashboard.html' })
export class AdminApp {
  visible = true;
  dialog = inject(MatDialog);
  open() { return this.dialog.open(AdminDialog); }
  openRegistered() { return this.dialog.open(DIALOGS.cool); }
}
