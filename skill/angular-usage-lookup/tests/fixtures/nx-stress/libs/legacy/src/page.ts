import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
@Component({ selector: 'legacy-page', standalone: false, templateUrl: './legacy-screen.html' })
export class LegacyPage {
  visible = true;
  rows = ['one', 'two'];
  dialog = inject(MatDialog);
  async openLazy() { const { CoolDialogComponent } = await import('@stress/dialogs'); return this.dialog.open(CoolDialogComponent); }
}
