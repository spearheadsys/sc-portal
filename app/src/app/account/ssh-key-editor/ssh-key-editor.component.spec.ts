import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SshKeyEditorComponent } from './ssh-key-editor.component';

describe('SshKeyEditorComponent', () => {
  let component: SshKeyEditorComponent;
  let fixture: ComponentFixture<SshKeyEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SshKeyEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SshKeyEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
