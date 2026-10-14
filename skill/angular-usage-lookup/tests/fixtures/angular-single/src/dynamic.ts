import { ViewContainerRef } from '@angular/core';
import { SuperCoolComponent } from './super-cool';

export function show(container: ViewContainerRef) {
  return container.createComponent(SuperCoolComponent);
}
export const exampleText = '<super-cool /> SuperCoolComponent';
