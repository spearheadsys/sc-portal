import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FirewallEditorComponent } from './firewall-editor.component';

describe('FirewallEditorComponent', () => {
  let component: FirewallEditorComponent;
  let fixture: ComponentFixture<FirewallEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FirewallEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FirewallEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
