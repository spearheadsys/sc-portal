import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { InstancesService } from './helpers/instances.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { debounceTime, delay, distinctUntilChanged, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { InstanceWizardComponent } from './instance-wizard/instance-wizard.component';
import { Instance } from './models/instance';
import { forkJoin, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CatalogService } from '../catalog/helpers/catalog.service';
import { PackageSelectorComponent } from './package-selector/package-selector.component';
import { PromptDialogComponent } from '../components/prompt-dialog/prompt-dialog.component';
import { InstanceTagEditorComponent } from './instance-tag-editor/instance-tag-editor.component';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { InstanceHistoryComponent } from './instance-history/instance-history.component';
import { CustomImageEditorComponent } from '../catalog/custom-image-editor/custom-image-editor.component';
import { VirtualScrollerComponent } from 'ngx-virtual-scroller';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import Fuse from 'fuse.js';
import { LabelType, Options } from '@angular-slider/ngx-slider';
import { FileSizePipe } from '../pipes/file-size.pipe';
import { sortArray } from '../helpers/utils.service';
import { VolumesService } from '../volumes/helpers/volumes.service';
import { Title } from "@angular/platform-browser";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-instances',
  templateUrl: './instances.component.html',
  styleUrls: ['./instances.component.scss']
})
export class InstancesComponent implements OnInit, OnDestroy
{
  @ViewChild(VirtualScrollerComponent)
  private virtualScroller: VirtualScrollerComponent;

  loadingIndicator = true;
  instances: Instance[] = [];
  listItems: Instance[];
  images = [];
  packages = [];
  volumes = [];
  lazyLoadDelay: number;
  canPrepareForLoading: boolean;
  editorForm: FormGroup;
  showMachineDetails: boolean;
  fullDetailsTwoColumns: boolean;
  runningInstanceCount = 0;
  stoppedInstanceCount = 0;
  instanceStateArray: string[] = [];
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
  constructor(private readonly instancesService: InstancesService,
    private readonly catalogService: CatalogService,
    private readonly volumesService: VolumesService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService,
    private readonly fb: FormBuilder,
    private readonly fileSizePipe: FileSizePipe,
    private readonly titleService: Title,
    private readonly translationService: TranslateService)
  {
    translationService.get('dashboard.title').pipe(first()).subscribe(x => titleService.setTitle(`Spearhead - ${x}`));

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

    if (this.instances.length === 1)
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
  private getInstances()
  {
    this.instancesService.get()
      .subscribe(instances =>
      {
        //// DEMO ONLY !!!!!
        //const arr = new Array(200);
        //for (let j = 0; j < 200; j++)
        //{
        //  const el = { ...instances[0] };
        //  el.name = this.dummyNames[j];
        //  arr[j] = el;
        //}/**/
        //// DEMO ONLY !!!!!

        this.instances = instances.map(instance =>
        {
          instance.metadataKeys = Object.keys(instance.metadata);
          instance.tagKeys = Object.keys(instance.tags);

          instance.loading = true; // Required for improved scrolling experience
          return instance;
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

        for (const instance of this.instances)
          this.fillInInstanceDetails(instance);
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
            imageFilter: [], // instances provisioned with a certain image
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
    let listItems: Instance[] = null;

    const searchTerm = this.editorForm.get('searchTerm').value;
    if (searchTerm.length >= 2)
    {
      const fuse = new Fuse(this.instances, this.fuseJsOptions);
      const fuseResults = fuse.search(searchTerm);
      listItems = fuseResults.map(x => x.item);
    }

    if (!listItems)
      listItems = [...this.instances];

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
  prepareForLoading(instances: Instance[])
  {
    for (const instance of instances)
      instance.loading = true;

    return instances;
  }

  // ----------------------------------------------------------------------------------------------------------------
  trackByFunction = (index: number, instance: Instance) => instance.name;

  // ----------------------------------------------------------------------------------------------------------------
  private computeFiltersOptions(computeOnlyState = false)
  {
    this.runningInstanceCount = 0;
    this.stoppedInstanceCount = 0;
    this.instanceStateArray = [];

    const memoryValues = {};
    const diskValues = {};

    for (const instance of this.instances)
    {
      if (instance.state === 'running')
        this.runningInstanceCount++;

      if (instance.state === 'stopped')
        this.stoppedInstanceCount++;

      if (!~this.instanceStateArray.indexOf(instance.state))
        this.instanceStateArray.push(instance.state);

      if (!computeOnlyState && !memoryValues[instance.memory])
        memoryValues[instance.memory] = true;

      if (!computeOnlyState && !diskValues[instance.disk])
        diskValues[instance.disk] = true;
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
  startMachine(instance: Instance)
  {
    if (instance.state !== 'stopped')
      return;

    instance.working = true;
    this.toastr.info(`Starting machine "${instance.name}"...`);

    this.instancesService.start(instance.id)
      .pipe(
        delay(1000),
        switchMap(() =>
          this.instancesService.getInstanceUntilExpectedState(instance, ['running'], x =>
          {
            instance.state = x.state;

            this.computeFiltersOptions();
          })
            .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(() =>
      {
        this.computeFiltersOptions();

        instance.working = false;
        this.toastr.info(`The machine "${instance.name}" has been started`);
      }, err =>
      {
        this.computeFiltersOptions();

        instance.working = false;
        this.toastr.error(`Machine "${instance.name}" error: ${err.error.message}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  restartMachine(instance: Instance)
  {
    if (instance.state !== 'running')
      return;

    instance.working = true;
    this.toastr.info(`Restarting machine "${instance.name}"...`);

    this.instancesService.reboot(instance.id)
      .pipe(
        delay(1000),
        switchMap(() => this.instancesService.getInstanceUntilExpectedState(instance, ['running'], x =>
        {
          instance.state = x.state;

          this.computeFiltersOptions();
        })
          .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(() =>
      {
        this.computeFiltersOptions();

        instance.working = false;

        this.toastr.info(`The machine "${instance.name}" has been restarted`);
      }, err =>
      {
        this.computeFiltersOptions();

        instance.working = false;
        this.toastr.error(`Machine "${instance.name}" error: ${err.error.message}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  stopMachine(instance: Instance)
  {
    if (instance.state !== 'running')
      return;

    instance.working = true;
    this.toastr.info(`Stopping machine "${instance.name}"`);

    this.instancesService.stop(instance.id)
      .pipe(
        delay(1000),
        switchMap(() => this.instancesService.getInstanceUntilExpectedState(instance, ['stopped'], x =>
        {
          instance.state = x.state;

          this.computeFiltersOptions();
        })
          .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(() =>
      {
        this.computeFiltersOptions();

        instance.working = false;
        this.toastr.info(`The machine "${instance.name}" has been stopped`);
      }, err =>
      {
        this.computeFiltersOptions();

        instance.working = false;
        this.toastr.error(`Machine "${instance.name}" error: ${err.error.message}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  resizeMachine(instance: Instance)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { instance }
    };

    const modalRef = this.modalService.show(PackageSelectorComponent, modalConfig);
    modalRef.setClass('modal-lg');

    modalRef.content.save
      .pipe(
        tap(() =>
        {
          this.toastr.info(`Changing specifications for machine "${instance.name}"...`);
          instance.working = true;
        }),
        first(),
        switchMap(pkg => this.instancesService.resize(instance.id, pkg.id).pipe(map(() => pkg)))
      )
      .subscribe(pkg =>
      {
        instance.package = pkg.name;
        instance.memory = pkg.memory;
        instance.disk = pkg.disk;

        this.fillInInstanceDetails(instance);

        this.computeFiltersOptions();

        instance.working = false;
        this.toastr.info(`The specifications for machine "${instance.name}" have been changed`);
      }, err =>
      {
        instance.working = false;
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Couldn't change the specifications for machine "${instance.name}" ${errorDetails}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  renameMachine(instance: Instance)
  {
    const instanceName = instance.name;

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        value: instanceName,
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
      if (name === instanceName)
      {
        this.toastr.warning(`You provided the same name for machine "${instanceName}"`);
        return;
      }

      instance.working = true;

      this.instancesService.rename(instance.id, name)
        .subscribe(() =>
        {
          instance.name = name;


          this.applyFiltersAndSort();

          this.toastr.info(`The "${instanceName}" machine has been renamed to "${instance.name}"`);
          instance.working = false;
        }, err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Couldn't rename the "${instanceName}" machine ${errorDetails}`);
          instance.working = false;
        });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  showTagEditor(instance: Instance, showMetadata = false)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { instance, showMetadata }
    };

    const modalRef = this.modalService.show(InstanceTagEditorComponent, modalConfig);
    modalRef.setClass('modal-lg');

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      // TODO: Refresh list
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  createImageFromMachine(instance: Instance)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { instance }
    };

    const modalRef = this.modalService.show(CustomImageEditorComponent, modalConfig);

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      this.toastr.info(`Creating a new image based on the "${instance.name}" machine...`);

      this.catalogService.createImage(instance.id, x.name, x.version, x.description)
        .pipe(
          delay(1000),
          switchMap(image => this.catalogService.getImageUntilExpectedState(image, ['active', 'failed'])
            .pipe(takeUntil(this.destroy$))
          )
        )
        .subscribe(image =>
        {
          if (image.state === 'active')
            this.toastr.info(`A new image "${x.name}" based on the "${instance.name}" machine has been created`);
          else
            this.toastr.error(`Failed to create an image based on the "${instance.name}" machine`);
        }, err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Failed to create an image based on the "${instance.name}" machine ${errorDetails}`);
        });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  createMachine(instance?: Instance)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { instance }
    };

    const modalRef = this.modalService.show(InstanceWizardComponent, modalConfig);
    modalRef.setClass('modal-xl');

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      if (!x) return;

      this.fillInInstanceDetails(x);

      this.instances.push(x);

      this.computeFiltersOptions();
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteMachine(instance: Instance)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${instance.name}" machine?`,
        confirmButtonText: 'Yes, delete this machine',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(first()).subscribe(() =>
    {
      instance.working = true;

      this.toastr.info(`Removing machine "${instance.name}"...`);

      this.instancesService.delete(instance.id)
        .subscribe(() =>
        {
          const index = this.instances.findIndex(i => i.id === instance.id);
          if (index >= 0)
            this.instances.splice(index, 1);

          this.computeFiltersOptions();

          this.toastr.info(`The machine "${instance.name}" has been removed`);
        },
          err =>
          {
            instance.working = false;
            this.toastr.error(`Machine "${instance.name}" error: ${err.error.message}`);
          });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  showMachineHistory(instance: Instance)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { instance }
    };

    const modalRef = this.modalService.show(InstanceHistoryComponent, modalConfig);
    modalRef.setClass('modal-lg');
  }

  // ----------------------------------------------------------------------------------------------------------------
  tabChanged(event, instance: Instance)
  {
    if (event.id.endsWith('info'))
      instance.shouldLoadInfo = this.editorForm.get('showMachineDetails').value;
    else if (event.id.endsWith('snapshots'))
      instance.shouldLoadSnapshots = this.editorForm.get('showMachineDetails').value;
    else if (event.id.endsWith('networks'))
      instance.shouldLoadNetworks = this.editorForm.get('showMachineDetails').value;
    else if (event.id.endsWith('volumes'))
    {
      //instance.shouldLoadVolumes = this.editorForm.get('showMachineDetails').value;
    }
    else if (event.id.endsWith('migrations'))
    {
      //instance.shouldLoadMigrations = this.editorForm.get('showMachineDetails').value;
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  loadInstanceDetails(instance: Instance): any
  {
    instance.loading = false;

    instance.working = !this.stableStates.includes(instance.state);

    // Keep polling the instances that are not in a "stable" state
    if (instance.working)
      this.instancesService.getInstanceUntilExpectedState(instance, this.stableStates, x =>
      {
        instance.state = x.state;

        this.computeFiltersOptions(true);
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe(x =>
        {
          instance.working = false;

          // Update the instance with what we got from the server
          const index = this.instances.findIndex(i => i.id === instance.id);
          if (index >= 0)
            this.instances.splice(index, 1, x);
        }, err =>
        {
          this.toastr.error(`Machine "${instance.name}" error: ${err.error.message}`);
          instance.working = false;
        });

    instance.shouldLoadInfo = true;
  }

  // ----------------------------------------------------------------------------------------------------------------
  watchInstanceState(instance: Instance)
  {
    instance.working = true;

    this.instancesService.getInstanceUntilExpectedState(instance, ['running'], x =>
    {
      instance.state = x.state;

      this.computeFiltersOptions(true);
    })
      .pipe(
        delay(3000),
        takeUntil(this.destroy$)
      ).subscribe(() => { }, err =>
      {
        instance.working = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  updateInstance(instance: Instance, updates: Instance)
  {
    instance.state = updates.state;
  }

  // ----------------------------------------------------------------------------------------------------------------
  setInstanceInfo(instance: Instance, dnsList)
  {
    // Update the instance as a result of the info panel's "load" event. We do this because the intances are (un)loaded
    // from the viewport as the user scrolls through the page, to optimize memory consumption.
    instance.dnsList = dnsList;
    instance.infoLoaded = true;
  }

  // ----------------------------------------------------------------------------------------------------------------
  setInstanceNetworks(instance: Instance, nics)
  {
    // Update the instance as a result of the networks panel's "load" event. We do this because the intances are (un)loaded
    // from the viewport as the user scrolls through the page, to optimize memory consumption.
    instance.nics = nics;
    instance.networksLoaded = true;
  }

  // ----------------------------------------------------------------------------------------------------------------
  setInstanceSnapshot(instance: Instance, snapshots)
  {
    // Update the instance as a result of the snapshots panel's "load" event. We do this because the intances are (un)loaded
    // from the viewport as the user scrolls through the page, to optimize memory consumption.
    instance.snapshots = snapshots;
    instance.snapshotsLoaded = true;
  }

  // ----------------------------------------------------------------------------------------------------------------
  private fillInInstanceDetails(instance: Instance)
  {
    const imageDetails = this.images.find(i => i.id === instance.image);
    if (imageDetails)
      instance.imageDetails = imageDetails;

    const packageDetails = this.packages.find(p => p.name === instance.package);
    if (packageDetails)
      instance.packageDetails = packageDetails;

    instance.volumes = this.volumes.filter(i => i.refs && i.refs.includes(instance.id));
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
    this.getInstances();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
