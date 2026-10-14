import { Component, Directive, EventEmitter, Input, Output, Pipe } from '@angular/core';
@Directive({selector:'[fancy],button[cool]:not([disabled])'})
export class FancyDirective {
  @Input('glow') strength = 0;
  @Output('glowed') changed = new EventEmitter<number>();
}
@Directive({selector:'[wrapped]',hostDirectives:[{directive: FancyDirective, inputs:['glow: power'], outputs:['glowed: powered']}]})
export class WrappedDirective {}
@Pipe({name:'format'})
export class FormatPipe { transform(value: string) { return value.toUpperCase(); } }
@Component({selector:'button[superButton],a[superButton]',template:'<ng-content />'})
export class ButtonComponent {}
