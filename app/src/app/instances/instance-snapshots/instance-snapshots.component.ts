import { Component, OnInit, OnDestroy, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { InstancesService } from '../helpers/instances.service';
import { ReplaySubject, Subject } from 'rxjs';
import { delay, first, switchMap, takeUntil, tap } from 'rxjs/operators';
import Fuse from 'fuse.js';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { Snapshot } from '../models/snapshot';
import { SnapshotsService } from '../helpers/snapshots.service';

@Component({
  selector: 'app-instance-snapshots',
  templateUrl: './instance-snapshots.component.html',
  styleUrls: ['./instance-snapshots.component.scss']
})
export class InstanceSnapshotsComponent implements OnInit, OnDestroy, OnChanges
{
  @Input()
  instance: any;

  @Input()
  loadSnapshots: boolean;

  @Output()
  processing = new EventEmitter();

  @Output()
  finishedProcessing = new EventEmitter();

  @Output()
  load = new EventEmitter();

  @Output()
  instanceStateUpdate = new EventEmitter();

  loadingSnapshots: boolean;
  snapshotsLoaded: boolean;
  filteredSnapshots: any[];
  snapshotName: string;
  _searchTerm: string;
  shouldSearch: boolean;

  private destroy$ = new Subject();
  private onChanges$ = new ReplaySubject();
  private snapshots: any[];
  private finishedLoading: boolean
  private readonly fuseJsOptions: {};

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly instancesService: InstancesService,
    private readonly snapshotsService: SnapshotsService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService)
  {
    // Configure FuseJs
    this.fuseJsOptions = {
      includeScore: false,
      minMatchCharLength: 2,
      includeMatches: false,
      shouldSort: false,
      threshold: .3, // Lower value means a more exact search
      keys: [
        { name: 'name', weight: .9 }
      ]
    };
  }

  // ----------------------------------------------------------------------------------------------------------------
  createSnapshot()
  {
    this.processing.emit();

    this.snapshots = this.snapshots || [];

    // Spaces are not allowed in snapshot names (not documented)!
    const snapshotName = this.snapshotName;

    // Clear this field
    this.snapshotName = null;

    this.snapshotsService.createSnapshot(this.instance.id, snapshotName)
      .pipe(
        takeUntil(this.destroy$),
        delay(1000),
        tap(x => this.snapshots.unshift(x)),
        switchMap((x: Snapshot) => this.snapshotsService.getSnapshotUntilExpectedState(this.instance, x, ['created'])
          .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(x =>
      {
        const index = this.snapshots.findIndex(s => s.name === snapshotName);

        if (index >= 0)
          this.snapshots[index] = x;

        this.finishedProcessing.emit();
        this.toastr.info(`A new snapshot "${snapshotName}" has been created for machine "${this.instance.name}"`);
      },
        err =>
        {
          const index = this.snapshots.findIndex(s => s.name === snapshotName);

          // Remove this snapshot from the list since it couldn't be created
          if (index >= 0)
            this.snapshots.splice(index, 1);

          this.finishedProcessing.emit();
          this.toastr.error(`Machine "${this.instance.name}" error: ${err.error.message}`);
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  restoreSnapshot(snapshot: Snapshot)
  {
    this.confirmRestore(snapshot)
      .subscribe(() =>
      {
        this.processing.emit();

        snapshot.working = true;

        // First we need to make sure the instance is stopped
        if (this.instance.state !== 'stopped')
          this.instancesService.stop(this.instance.id)
            .pipe(
              takeUntil(this.destroy$),
              tap(() => this.toastr.info(`Restarting machine "${this.instance.name}"`)),
              delay(1000),
              switchMap(() => this.instancesService.getInstanceUntilExpectedState(this.instance, ['stopped'], x => this.instanceStateUpdate.emit(x))
                .pipe(takeUntil(this.destroy$))
              )
            ).subscribe(() => 
            {
              snapshot.working = false;
              this.startMachineFromSnapshot(snapshot);
            },
              err =>
              {
                snapshot.working = false;
                this.finishedProcessing.emit();

                this.toastr.error(`Machine "${this.instance.name}" error: ${err.error.message}`);
              });
        else
          this.startMachineFromSnapshot(snapshot);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private confirmRestore(snapshot: Snapshot)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Restoring the "${snapshot.name}" snapshot will reboot your machine. Do you wish to continue?`,
        confirmButtonText: 'Yes, reboot and restore',
        declineButtonText: "No, don't restore"
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    return modalRef.content.confirm.pipe(first());
  }

  // ----------------------------------------------------------------------------------------------------------------
  private startMachineFromSnapshot(snapshot: Snapshot)
  {
    this.processing.emit();

    this.toastr.info(`Restoring machine "${this.instance.name}" from "${snapshot.name}" snapshot`);

    this.snapshotsService.startFromSnapshot(this.instance.id, snapshot.name)
      .pipe(
        takeUntil(this.destroy$),
        delay(1000),
        switchMap(() => this.instancesService.getInstanceUntilExpectedState(this.instance, ['running'], x => this.instanceStateUpdate.emit(x), 20)
          .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(() =>
      {
        snapshot.working = false;

        this.finishedProcessing.emit();

        this.toastr.info(`The machine "${this.instance.name}" has been started from the "${snapshot.name}" snapshot`);
      }, err =>
      {
        snapshot.working = false;

        this.finishedProcessing.emit();

        this.toastr.error(`Machine "${this.instance.name}" error: ${err.error.message}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteSnapshot(snapshot: Snapshot)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${snapshot.name}" snapshot?`,
        confirmButtonText: 'Yes, delete this snapshot',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(first()).subscribe(() =>
    {
      this.processing.emit();

      this.snapshotsService.deleteSnapshot(this.instance.id, snapshot.name)
        .subscribe(() =>
        {
          const index = this.snapshots.findIndex(s => s.name === snapshot.name);
          if (index >= 0)
            this.snapshots.splice(index, 1);

          this.finishedProcessing.emit();

          this.toastr.info(`The "${snapshot.name}" snapshot has been deleted`);
        }, err =>
        {
          this.finishedProcessing.emit();

          this.toastr.error(`The "${snapshot.name}" snapshot couldn't be deleted: ${err.error.message}`);
        });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getSnapshots()
  {
    if (this.snapshotsLoaded || this.instance.state === 'provisioning') return

    this.loadingSnapshots = true;

    // Get the list of snapshots
    this.snapshotsService.getSnapshots(this.instance.id)
      .subscribe(x =>
      {
        this.snapshots = x;
        this.filteredSnapshots = x;

        this.loadingSnapshots = false;
        this.snapshotsLoaded = true;
        this.load.emit(x);
      },
        err =>
        {
          this.toastr.error(err.error.message);
          this.loadingSnapshots = false;
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  searchBoxFocused(isFocused = true)
  {
    if (isFocused)
      this.shouldSearch = true;
    else
      this.shouldSearch = !!this.searchTerm;
  }

  // ----------------------------------------------------------------------------------------------------------------
  get searchTerm()
  {
    return this._searchTerm;
  }
  set searchTerm(value: string)
  {
    this._searchTerm = value;

    if (!value)
    {
      this.filteredSnapshots = this.snapshots;
    }
    else
    {
      // Use fuzzy search for lookups
      const fuse = new Fuse(this.snapshots, this.fuseJsOptions);
      this.filteredSnapshots = fuse.search(value).map(x => x.item);
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.snapshots = this.instance?.snapshots;
    this.filteredSnapshots = this.snapshots;

    this.onChanges$.pipe(takeUntil(this.destroy$)).subscribe(() =>
    {
      if (!this.finishedLoading && this.loadSnapshots && !this.instance?.snapshotsLoaded)
        this.getSnapshots();
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnChanges(changes: SimpleChanges): void
  {
    // Since we can't control if ngOnChanges is executed before ngOnInit, we need this trick
    this.onChanges$.next(changes);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
