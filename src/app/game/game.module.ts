import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GameComponent } from './game.component';
import { GameRoutingModule } from './game-routing.module';

import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  imports: [ CommonModule, FormsModule, IonicModule, GameRoutingModule, NgSelectModule],
  declarations: [GameComponent],
  exports: [GameComponent]
})
export class GameComponentModule {}
