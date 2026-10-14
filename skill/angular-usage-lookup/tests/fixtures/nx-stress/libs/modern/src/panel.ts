import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule, ExportedCool } from '@stress/shared';
import { LegacyFeatureModule } from '@stress/legacy';
@Component({ selector: 'modern-panel', imports: [CommonModule, SharedModule, LegacyFeatureModule], templateUrl: './modern.html' })
export class ModernPanel {
  visible = true;
  rows = ['one', 'two'];
  @ViewChild(ExportedCool) selected?: ExportedCool;
}
