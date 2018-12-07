import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
    ViewContainerRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalDialogService } from 'nativescript-angular/directives/dialogs';
import { RouterExtensions } from 'nativescript-angular/router';
import { ItemEventData } from 'tns-core-modules/ui/list-view';

import { ModalComponent } from '../modal.component';

import { CollectionService } from 'jslib/abstractions/collection.service';
import { FolderService } from 'jslib/abstractions/folder.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { SearchService } from 'jslib/abstractions/search.service';
import { StateService } from 'jslib/abstractions/state.service';

import { CipherType } from 'jslib/enums/cipherType';

import { CipherView } from 'jslib/models/view/cipherView';
import { CollectionView } from 'jslib/models/view/collectionView';
import { FolderView } from 'jslib/models/view/folderView';

import { TreeNode } from 'jslib/models/domain/treeNode';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

import { CiphersComponent as BaseCiphersComponent } from 'jslib/angular/components/ciphers.component';

const ComponentId = 'CiphersComponent';

@Component({
    selector: 'app-ciphers',
    templateUrl: 'ciphers.component.html',
})
export class CiphersComponent extends BaseCiphersComponent implements OnInit, OnDestroy {
    groupingTitle: string;
    state: any;
    folderId: string = null;
    collectionId: string = null;
    type: CipherType = null;
    nestedFolders: Array<TreeNode<FolderView>>;
    nestedCollections: Array<TreeNode<CollectionView>>;

    private inited = false;

    constructor(searchService: SearchService, private route: ActivatedRoute,
        private ngZone: NgZone, private broadcasterService: BroadcasterService,
        private changeDetectorRef: ChangeDetectorRef, private stateService: StateService,
        private i18nService: I18nService, private routerExtensions: RouterExtensions,
        private folderService: FolderService, private collectionService: CollectionService,
        private platformUtilsService: PlatformUtilsService, private modalDialogService: ModalDialogService,
        private vcRef: ViewContainerRef) {
        super(searchService);
    }

    async ngOnInit() {
        this.route.queryParams.subscribe(async (params) => {
            if (this.inited) {
                return;
            }
            this.inited = true;
            if (params.type) {
                this.searchPlaceholder = this.i18nService.t('searchType');
                this.type = parseInt(params.type, null);
                switch (this.type) {
                    case CipherType.Login:
                        this.groupingTitle = this.i18nService.t('logins');
                        break;
                    case CipherType.Card:
                        this.groupingTitle = this.i18nService.t('cards');
                        break;
                    case CipherType.Identity:
                        this.groupingTitle = this.i18nService.t('identities');
                        break;
                    case CipherType.SecureNote:
                        this.groupingTitle = this.i18nService.t('secureNotes');
                        break;
                    default:
                        break;
                }
                await super.load((c) => c.type === this.type);
            } else if (params.folderId) {
                this.folderId = params.folderId === 'none' ? null : params.folderId;
                this.searchPlaceholder = this.i18nService.t('searchFolder');
                if (this.folderId != null) {
                    const folderNode = await this.folderService.getNested(this.folderId);
                    if (folderNode != null && folderNode.node != null) {
                        this.groupingTitle = folderNode.node.name;
                        this.nestedFolders = folderNode.children != null && folderNode.children.length > 0 ?
                            folderNode.children : null;
                    }
                } else {
                    this.groupingTitle = this.i18nService.t('noneFolder');
                }
                await super.load((c) => c.folderId === this.folderId);
            } else if (params.collectionId) {
                this.collectionId = params.collectionId;
                this.searchPlaceholder = this.i18nService.t('searchCollection');
                const collectionNode = await this.collectionService.getNested(this.collectionId);
                if (collectionNode != null && collectionNode.node != null) {
                    this.groupingTitle = collectionNode.node.name;
                    this.nestedCollections = collectionNode.children != null && collectionNode.children.length > 0 ?
                        collectionNode.children : null;
                }
                await super.load((c) => c.collectionIds != null && c.collectionIds.indexOf(this.collectionId) > -1);
            } else {
                this.groupingTitle = this.i18nService.t('allItems');
                await super.load();
            }
        });

        this.broadcasterService.subscribe(ComponentId, (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'syncCompleted':
                        if (message.successfully) {
                            setTimeout(() => {
                                this.refresh();
                            }, 500);
                        }
                        break;
                    default:
                        break;
                }

                this.changeDetectorRef.detectChanges();
            });
        });
    }

    ngOnDestroy() {
        this.broadcasterService.unsubscribe(ComponentId);
    }

    selectCipher(cipher: CipherView) {
        super.selectCipher(cipher);
        this.modalDialogService.showModal(ModalComponent, {
            context: { path: 'view-cipher', cipherId: cipher.id },
            fullscreen: true,
            viewContainerRef: this.vcRef,
        }).then((res) => {
            console.log(res);
        });
    }

    selectFolder(folder: FolderView) {
        if (folder.id != null) {
            this.routerExtensions.navigate(['/ciphers'], { queryParams: { folderId: folder.id } });
        }
    }

    selectCollection(collection: CollectionView) {
        this.routerExtensions.navigate(['/ciphers'], { queryParams: { collectionId: collection.id } });
    }

    async launchCipher(cipher: CipherView) {
        if (cipher.type !== CipherType.Login || !cipher.login.canLaunch) {
            return;
        }
        // this.analytics.eventTrack.next({ action: 'Launched URI From Listing' });
        // BrowserApi.createNewTab(cipher.login.uri);
    }

    addCipher() {
        super.addCipher();
        /*
        this.router.navigate(['/add-cipher'], {
            queryParams: {
                folderId: this.folderId,
                type: this.type,
                collectionId: this.collectionId,
            },
        });
        */
    }

    back() {
        // this.location.back();
    }

    showGroupings() {
        return !this.isSearching() &&
            ((this.nestedFolders && this.nestedFolders.length) ||
                (this.nestedCollections && this.nestedCollections.length));
    }

    isSearching() {
        return !this.searchPending && this.searchService.isSearchable(this.searchText);
    }

    onItemTap(args: ItemEventData) {
        this.selectCipher(this.ciphers[args.index]);
    }

    onItemLoading(args: ItemEventData) {
        
    }
}