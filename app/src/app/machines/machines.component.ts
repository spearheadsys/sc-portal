import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MachinesService } from './helpers/machines.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { debounceTime, delay, distinctUntilChanged, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MachineWizardComponent } from './machine-wizard/machine-wizard.component';
import { Machine } from './models/machine';
import { forkJoin, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CatalogService } from '../catalog/helpers/catalog.service';
import { PackageSelectorComponent } from './package-selector/package-selector.component';
import { PromptDialogComponent } from '../components/prompt-dialog/prompt-dialog.component';
import { MachineTagEditorComponent } from './machine-tag-editor/machine-tag-editor.component';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { MachineHistoryComponent } from './machine-history/machine-history.component';
import { CustomImageEditorComponent } from '../catalog/custom-image-editor/custom-image-editor.component';
import { VirtualScrollerComponent } from 'ngx-virtual-scroller';
import { FormGroup, FormBuilder } from '@angular/forms';
import Fuse from 'fuse.js';
import { LabelType, Options } from '@angular-slider/ngx-slider';
import { FileSizePipe } from '../pipes/file-size.pipe';
import { sortArray } from '../helpers/utils.service';
import { VolumesService } from '../volumes/helpers/volumes.service';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-machines',
  templateUrl: './machines.component.html',
  styleUrls: ['./machines.component.scss']
})
export class MachinesComponent implements OnInit, OnDestroy
{
  @ViewChild(VirtualScrollerComponent)
  private virtualScroller: VirtualScrollerComponent;

  loadingIndicator = true;
  machines: Machine[] = [];
  listItems: Machine[];
  images = [];
  packages = [];
  volumes = [];
  lazyLoadDelay: number;
  canPrepareForLoading: boolean;
  editorForm: FormGroup;
  showMachineDetails: boolean;
  fullDetailsTwoColumns: boolean;
  runningMachineCount = 0;
  stoppedMachineCount = 0;
  machineStateArray: string[] = [];
  memoryFilterOptions: Options = {
    animate: false,
    stepsArray: [],
    draggableRange: true,
    showTicks: true,
    translate: this.translateBytes.bind(this)
  };
  diskFilterOptions: Options = {
    animate: false,
    stepsArray: [],
    draggableRange: true,
    showTicks: true,
    translate: this.translateBytes.bind(this)
  };

  private destroy$ = new Subject();
  private stableStates = ['running', 'stopped'];
  private minimumLazyLoadDelay = 1000;
  private readonly fuseJsOptions: {};

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly machinesService: MachinesService,
    private readonly catalogService: CatalogService,
    private readonly volumesService: VolumesService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService,
    private readonly fb: FormBuilder,
    private readonly fileSizePipe: FileSizePipe,
    private readonly titleService: Title,
    private readonly translationService: TranslateService)
  {
    translationService.get('machines.title').pipe(first()).subscribe(x => titleService.setTitle(`Spearhead - ${x}`));

    this.lazyLoadDelay = this.minimumLazyLoadDelay;

    // Configure FuseJs
    this.fuseJsOptions = {
      includeScore: false,
      minMatchCharLength: 2,
      includeMatches: true,
      shouldSort: false,
      threshold: .3, // Lower value means a more exact search
      keys: [
        { name: 'name', weight: .9 },
        { name: 'metadataKeys', weight: .7 },
        { name: 'tagKeys', weight: .7 },
        { name: 'os', weight: .5 },
        { name: 'brand', weight: .5 }
      ]
    };

    this.showMachineDetails = !!JSON.parse(localStorage.getItem('showMachineDetails') || '0');
    this.fullDetailsTwoColumns = !!JSON.parse(localStorage.getItem('fullDetailsTwoColumns') || '1');

    this.createForm();
  }

  // ----------------------------------------------------------------------------------------------------------------
  private translateBytes(value: number, label: LabelType): string
  {
    const formattedValue = this.fileSizePipe.transform(value * 1024 * 1024);

    if (this.machines.length === 1)
      return formattedValue;

    switch (label)
    {
      case LabelType.Low:
        return `Between ${formattedValue}`;
      case LabelType.High:
        return `and ${formattedValue}`;
      default:
        return formattedValue;
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getMachines()
  {
    this.machinesService.get()
      .subscribe(machines =>
      {
        //// DEMO ONLY !!!!!
        //const arr = new Array(200);
        //for (let j = 0; j < 200; j++)
        //{
        //  const el = { ...machines[0] };
        //  el.name = this.dummyNames[j];
        //  arr[j] = el;
        //}/**/
        //// DEMO ONLY !!!!!

        this.machines = machines.map(machine =>
        {
          machine.metadataKeys = Object.keys(machine.metadata);
          machine.tagKeys = Object.keys(machine.tags);

          machine.loading = true; // Required for improved scrolling experience
          return machine;
        });

        this.getImagesPackagesAndVolumes();

        this.computeFiltersOptions();

        this.applyFiltersAndSort();

        this.loadingIndicator = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getImagesPackagesAndVolumes()
  {
    forkJoin({
      images: this.catalogService.getImages(),
      packages: this.catalogService.getPackages(),
      volumes: this.volumesService.getVolumes()
    })
      .subscribe(response =>
      {
        this.images = response.images;
        this.packages = response.packages;
        this.volumes = response.volumes;

        for (const machine of this.machines)
          this.fillInMachineDetails(machine);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        searchTerm: [''],
        sortProperty: ['name'],
        filters: this.fb.group(
          {
            stateFilter: [],
            brandFilter: [],
            typeFilter: [],
            memoryFilter: [[0, 0]],
            diskFilter: [[0, 0]],
            imageFilter: [], // machines provisioned with a certain image
          }),
        filtersActive: [false],
        showMachineDetails: [this.showMachineDetails],
        fullDetailsTwoColumns: [{ value: this.fullDetailsTwoColumns, disabled: !this.showMachineDetails }]
      });

    this.editorForm.get('searchTerm').valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());

    this.editorForm.get('sortProperty').valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());

    this.editorForm.get('filters').valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());

    this.editorForm.get('showMachineDetails').valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(showMachineDetails =>
      {
        this.editorForm.get('showMachineDetails').disable();

        // Performance hack
        setTimeout(() => this.showMachineDetails = !!showMachineDetails, 0);

        this.updateList();

        // Store this setting in the local storage
        localStorage.setItem('showMachineDetails', JSON.stringify(showMachineDetails));

        setTimeout(() =>
        {
          this.editorForm.get('showMachineDetails').enable();

          if (showMachineDetails)
            this.editorForm.get('fullDetailsTwoColumns').enable();
          else
            this.editorForm.get('fullDetailsTwoColumns').disable();
        }, 300);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private applyFiltersAndSort()
  {
    let listItems: Machine[] = null;

    const searchTerm = this.editorForm.get('searchTerm').value;
    if (searchTerm.length >= 2)
    {
      const fuse = new Fuse(this.machines, this.fuseJsOptions);
      const fuseResults = fuse.search(searchTerm);
      listItems = fuseResults.map(x => x.item);
    }

    if (!listItems)
      listItems = [...this.machines];

    const stateFilter = this.editorForm.get(['filters', 'stateFilter']).value;
    if (stateFilter)
    {
      listItems = listItems.filter(x => x.state === stateFilter);
      this.editorForm.get('filtersActive').setValue(true);
    }

    const memoryFilter = this.editorForm.get(['filters', 'memoryFilter']).value;
    if (memoryFilter.every(x => !!x))
    {
      listItems = listItems.filter(x => x.memory >= memoryFilter[0] && x.memory <= memoryFilter[1]);
      //this.editorForm.get('filtersActive').setValue(true);
    }

    const diskFilter = this.editorForm.get(['filters', 'diskFilter']).value;
    if (memoryFilter.every(x => !!x))
    {
      listItems = listItems.filter(x => x.disk >= diskFilter[0] && x.disk <= diskFilter[1]);
      //this.editorForm.get('filtersActive').setValue(true);
    }

    this.listItems = sortArray(listItems, this.editorForm.get('sortProperty').value);
  }

  // ----------------------------------------------------------------------------------------------------------------
  clearFilters()
  {
    this.editorForm.get('filters').reset();
    this.editorForm.get('filtersActive').setValue(false);

    this.computeFiltersOptions();
  }

  // ----------------------------------------------------------------------------------------------------------------
  setSortProperty(propertyName: string)
  {
    this.editorForm.get('sortProperty').setValue(propertyName);
  }

  // ----------------------------------------------------------------------------------------------------------------
  setStateFilter(state?: string)
  {
    this.editorForm.get(['filters', 'stateFilter']).setValue(state);
  }

  // ----------------------------------------------------------------------------------------------------------------
  clearSearch()
  {
    this.editorForm.get('searchTerm').setValue('');
  }

  // ----------------------------------------------------------------------------------------------------------------
  updateList()
  {
    this.virtualScroller.refresh();
  }

  // ----------------------------------------------------------------------------------------------------------------
  prepareForLoading(machines: Machine[])
  {
    for (const machine of machines)
      machine.loading = true;

    return machines;
  }

  // ----------------------------------------------------------------------------------------------------------------
  trackByFunction = (index: number, machine: Machine) => machine.name;

  // ----------------------------------------------------------------------------------------------------------------
  private computeFiltersOptions(computeOnlyState = false)
  {
    this.runningMachineCount = 0;
    this.stoppedMachineCount = 0;
    this.machineStateArray = [];

    const memoryValues = {};
    const diskValues = {};

    for (const machine of this.machines)
    {
      if (machine.state === 'running')
        this.runningMachineCount++;

      if (machine.state === 'stopped')
        this.stoppedMachineCount++;

      if (!~this.machineStateArray.indexOf(machine.state))
        this.machineStateArray.push(machine.state);

      if (!computeOnlyState && !memoryValues[machine.memory])
        memoryValues[machine.memory] = true;

      if (!computeOnlyState && !diskValues[machine.disk])
        diskValues[machine.disk] = true;
    }

    if (computeOnlyState)
      return;

    const memoryValuesArray = Object.keys(memoryValues);
    this.memoryFilterOptions.stepsArray = memoryValuesArray.map(x => ({ legend: '', value: parseInt(x) }));
    if (this.memoryFilterOptions.stepsArray.length)
      this.editorForm.get(['filters', 'memoryFilter']).setValue([
        this.memoryFilterOptions.stepsArray[0].value,
        this.memoryFilterOptions.stepsArray[this.memoryFilterOptions.stepsArray.length - 1].value
      ]);

    const diskValuesArray = Object.keys(diskValues);
    this.diskFilterOptions.stepsArray = diskValuesArray.map(x => ({ legend: '', value: parseInt(x) }));
    if (this.diskFilterOptions.stepsArray.length)
      this.editorForm.get(['filters', 'diskFilter']).setValue([
        this.diskFilterOptions.stepsArray[0].value,
        this.diskFilterOptions.stepsArray[this.diskFilterOptions.stepsArray.length - 1].value
      ]);
  }

  // ----------------------------------------------------------------------------------------------------------------
  startMachine(machine: Machine)
  {
    machine.contextMenu = false;

    if (machine.state !== 'stopped')
      return;

    machine.working = true;
    this.toastr.info(`Starting machine "${machine.name}"...`);

    this.machinesService.start(machine.id)
      .pipe(
        delay(1000),
        switchMap(() =>
          this.machinesService.getMachineUntilExpectedState(machine, ['running'], x =>
          {
            machine.state = x.state;

            this.computeFiltersOptions();
          })
            .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(() =>
      {
        this.computeFiltersOptions();

        machine.working = false;
        this.toastr.info(`The machine "${machine.name}" has been started`);
      }, err =>
      {
        this.computeFiltersOptions();

        machine.working = false;
        this.toastr.error(`Machine "${machine.name}" error: ${err.error.message}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  restartMachine(machine: Machine)
  {
    machine.contextMenu = false;

    if (machine.state !== 'running')
      return;

    machine.working = true;
    this.toastr.info(`Restarting machine "${machine.name}"...`);

    this.machinesService.reboot(machine.id)
      .pipe(
        delay(1000),
        switchMap(() => this.machinesService.getMachineUntilExpectedState(machine, ['running'], x =>
        {
          machine.state = x.state;

          this.computeFiltersOptions();
        })
          .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(() =>
      {
        this.computeFiltersOptions();

        machine.working = false;

        this.toastr.info(`The machine "${machine.name}" has been restarted`);
      }, err =>
      {
        this.computeFiltersOptions();

        machine.working = false;
        this.toastr.error(`Machine "${machine.name}" error: ${err.error.message}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  stopMachine(machine: Machine)
  {
    machine.contextMenu = false;

    if (machine.state !== 'running')
      return;

    machine.working = true;
    this.toastr.info(`Stopping machine "${machine.name}"`);

    this.machinesService.stop(machine.id)
      .pipe(
        delay(1000),
        switchMap(() => this.machinesService.getMachineUntilExpectedState(machine, ['stopped'], x =>
        {
          machine.state = x.state;

          this.computeFiltersOptions();
        })
          .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(() =>
      {
        this.computeFiltersOptions();

        machine.working = false;
        this.toastr.info(`The machine "${machine.name}" has been stopped`);
      }, err =>
      {
        this.computeFiltersOptions();

        machine.working = false;
        this.toastr.error(`Machine "${machine.name}" error: ${err.error.message}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  resizeMachine(machine: Machine)
  {
    machine.contextMenu = false;

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { machine }
    };

    const modalRef = this.modalService.show(PackageSelectorComponent, modalConfig);
    modalRef.setClass('modal-lg');

    modalRef.content.save
      .pipe(
        tap(() =>
        {
          this.toastr.info(`Changing specifications for machine "${machine.name}"...`);
          machine.working = true;
        }),
        first(),
        switchMap(pkg => this.machinesService.resize(machine.id, pkg.id).pipe(map(() => pkg)))
      )
      .subscribe(pkg =>
      {
        machine.package = pkg.name;
        machine.memory = pkg.memory;
        machine.disk = pkg.disk;

        this.fillInMachineDetails(machine);

        this.computeFiltersOptions();

        machine.working = false;
        this.toastr.info(`The specifications for machine "${machine.name}" have been changed`);
      }, err =>
      {
        machine.working = false;
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Couldn't change the specifications for machine "${machine.name}" ${errorDetails}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  renameMachine(machine: Machine)
  {
    machine.contextMenu = false;

    const machineName = machine.name;

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        value: machineName,
        required: true,
        title: 'Rename machine',
        prompt: 'Type in the new name for your machine',
        placeholder: 'New machine name',
        saveButtonText: 'Change machine name'
      }
    };

    const modalRef = this.modalService.show(PromptDialogComponent, modalConfig);

    modalRef.content.save.pipe(first()).subscribe(name =>
    {
      if (name === machineName)
      {
        this.toastr.warning(`You provided the same name for machine "${machineName}"`);
        return;
      }

      machine.working = true;

      this.machinesService.rename(machine.id, name)
        .subscribe(() =>
        {
          machine.name = name;

          this.applyFiltersAndSort();

          this.toastr.info(`The "${machineName}" machine has been renamed to "${machine.name}"`);
          machine.working = false;
        }, err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Couldn't rename the "${machineName}" machine ${errorDetails}`);
          machine.working = false;
        });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  showTagEditor(machine: Machine, showMetadata = false)
  {
    machine.contextMenu = false;

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { machine, showMetadata }
    };

    const modalRef = this.modalService.show(MachineTagEditorComponent, modalConfig);
    modalRef.setClass('modal-lg');

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      machine[showMetadata ? 'metadata' : 'tags'] = x;
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  createImageFromMachine(machine: Machine)
  {
    machine.contextMenu = false;

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { machine }
    };

    const modalRef = this.modalService.show(CustomImageEditorComponent, modalConfig);

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      this.toastr.info(`Creating a new image based on the "${machine.name}" machine...`);

      this.catalogService.createImage(machine.id, x.name, x.version, x.description)
        .pipe(
          delay(1000),
          switchMap(image => this.catalogService.getImageUntilExpectedState(image, ['active', 'failed'])
            .pipe(takeUntil(this.destroy$))
          )
        )
        .subscribe(image =>
        {
          if (image.state === 'active')
            this.toastr.info(`A new image "${x.name}" based on the "${machine.name}" machine has been created`);
          else
            this.toastr.error(`Failed to create an image based on the "${machine.name}" machine`);
        }, err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Failed to create an image based on the "${machine.name}" machine ${errorDetails}`);
        });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  createMachine(machine?: Machine)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { machine }
    };

    const modalRef = this.modalService.show(MachineWizardComponent, modalConfig);
    modalRef.setClass('modal-xl');

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      if (!x) return;

      x.working = true;

      this.fillInMachineDetails(x);

      this.machines.push(x);

      this.computeFiltersOptions();
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteMachine(machine: Machine)
  {
    machine.contextMenu = false;

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${machine.name}" machine?`,
        confirmButtonText: 'Yes, delete this machine',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(first()).subscribe(() =>
    {
      machine.working = true;

      this.toastr.info(`Removing machine "${machine.name}"...`);

      this.machinesService.delete(machine.id)
        .subscribe(() =>
        {
          const index = this.machines.findIndex(i => i.id === machine.id);
          if (index < 0) return;

          this.machines.splice(index, 1);

          this.computeFiltersOptions();

          this.toastr.info(`The machine "${machine.name}" has been removed`);
        },
          err =>
          {
            machine.working = false;
            this.toastr.error(`Machine "${machine.name}" error: ${err.error.message}`);
          });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  showMachineHistory(machine: Machine)
  {
    machine.contextMenu = false;

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { machine }
    };

    const modalRef = this.modalService.show(MachineHistoryComponent, modalConfig);
    modalRef.setClass('modal-lg');
  }

  // ----------------------------------------------------------------------------------------------------------------
  tabChanged(event, machine: Machine)
  {
    if (event.id.endsWith('info'))
      machine.shouldLoadInfo = this.editorForm.get('showMachineDetails').value;
    else if (event.id.endsWith('snapshots'))
      machine.shouldLoadSnapshots = this.editorForm.get('showMachineDetails').value;
    else if (event.id.endsWith('networks'))
      machine.shouldLoadNetworks = this.editorForm.get('showMachineDetails').value;
    else if (event.id.endsWith('volumes'))
    {
      //machine.shouldLoadVolumes = this.editorForm.get('showMachineDetails').value;
    }
    else if (event.id.endsWith('migrations'))
    {
      //machine.shouldLoadMigrations = this.editorForm.get('showMachineDetails').value;
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  loadMachineDetails(machine: Machine): any
  {
    machine.loading = false;

    machine.working = !this.stableStates.includes(machine.state);

    // Keep polling the machines that are not in a "stable" state
    if (machine.working)
      this.machinesService.getMachineUntilExpectedState(machine, this.stableStates, x =>
      {
        machine.state = x.state;

        // This allows us to trigger later on when the state changes to a something stable
        machine.shouldLoadInfo = false;

        this.computeFiltersOptions(true);
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe(x =>
        {
          machine.working = false;

          // Update the machine with what we got from the server
          Object.assign(machine, x);

          machine.shouldLoadInfo = this.editorForm.get('showMachineDetails').value;

          this.computeFiltersOptions();
        }, err =>
        {
          if (err.status === 410)
          {
            const index = this.machines.findIndex(i => i.id === machine.id);
            if (index >= 0)
            {
              this.machines.splice(index, 1);

              this.computeFiltersOptions();

              this.toastr.error(`The machine "${machine.name}" has been removed`);
            }
          }
          else
            this.toastr.error(`Machine "${machine.name}" error: ${err.error.message}`);

          machine.working = false;
        });

    machine.shouldLoadInfo = this.editorForm.get('showMachineDetails').value;
  }

  // ----------------------------------------------------------------------------------------------------------------
  watchMachineState(machine: Machine)
  {
    machine.working = true;

    this.machinesService.getMachineUntilExpectedState(machine, ['running'], x =>
    {
      machine.state = x.state;

      this.computeFiltersOptions(true);
    })
      .pipe(
        delay(3000),
        takeUntil(this.destroy$)
      ).subscribe(() => { }, err =>
      {
        machine.working = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  updateMachine(machine: Machine, updates: Machine)
  {
    machine.refreshInfo = machine.state !== updates.state;
    machine.state = updates.state;
  }

  // ----------------------------------------------------------------------------------------------------------------
  setMachineInfo(machine: Machine, dnsList)
  {
    // Update the machine as a result of the info panel's "load" event. We do this because the intances are (un)loaded
    // from the viewport as the user scrolls through the page, to optimize memory consumption.
    machine.dnsList = dnsList;
    machine.infoLoaded = true;
  }

  // ----------------------------------------------------------------------------------------------------------------
  setMachineNetworks(machine: Machine, nics)
  {
    // Update the machine as a result of the networks panel's "load" event. We do this because the intances are (un)loaded
    // from the viewport as the user scrolls through the page, to optimize memory consumption.
    machine.nics = nics;
    machine.networksLoaded = true;
  }

  // ----------------------------------------------------------------------------------------------------------------
  setMachineSnapshots(machine: Machine, snapshots)
  {
    // Update the machine as a result of the snapshots panel's "load" event. We do this because the intances are (un)loaded
    // from the viewport as the user scrolls through the page, to optimize memory consumption.
    machine.snapshots = snapshots;
    machine.snapshotsLoaded = true;
  }

  // ----------------------------------------------------------------------------------------------------------------
  refreshMachineDnsList(machine: Machine)
  {
    machine.working = false;
    machine.refreshInfo = true;
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleMachineDetails()
  {
    this.showMachineDetails = !this.showMachineDetails;
    this.editorForm.get('showMachineDetails').setValue(this.showMachineDetails);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private fillInMachineDetails(machine: Machine)
  {
    const imageDetails = this.images.find(i => i.id === machine.image);
    if (imageDetails)
      machine.imageDetails = imageDetails;

    const packageDetails = this.packages.find(p => p.name === machine.package);
    if (packageDetails)
      machine.packageDetails = packageDetails;

    machine.volumes = this.volumes.filter(i => i.refs && i.refs.includes(machine.id));
  }

  // ----------------------------------------------------------------------------------------------------------------
  private randomIntFromInterval(min, max)
  {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.getMachines();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
