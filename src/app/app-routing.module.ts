import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { GameComponent } from './game/game.component'

const routes: Routes = [
  { path: '', component: GameComponent },
  { path: '**', redirectTo: '/' }
]
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
