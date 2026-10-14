import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from '@stress/shared';
import { ModernPanel } from '@stress/modern';
import { ReportPanel } from '@stress/reporting';
import { CoolDialogComponent, DialogLauncher } from '@stress/dialogs';
@Component({ imports: [CommonModule, SharedModule, ModernPanel, ReportPanel], template: '<modern-panel /><report-panel /><super-cool *ngIf="ready" />' })
export class StorefrontApp {
  ready = true;
  dialog = inject(MatDialog);
  launcher = inject(DialogLauncher);
  open() { return this.dialog.open(CoolDialogComponent); }
  openViaService() { return this.launcher.openDirect(); }
}
