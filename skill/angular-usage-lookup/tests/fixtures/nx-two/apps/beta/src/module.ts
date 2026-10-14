import { NgModule } from '@angular/core';
import { SuperCoolComponent } from '@lookup/ui';
import { BetaApp } from './app';

@NgModule({ declarations: [BetaApp], imports: [SuperCoolComponent] })
export class BetaModule {}
