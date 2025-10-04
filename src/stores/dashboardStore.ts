import { create, StateCreator } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';

// Types for our dashboard state
export interface DateRange {
  start?: Date;
  end?: Date;
}

export interface FilterState {
  institucion: string;
  anioDesde: string;
  anioHasta: string;
  procedimientos: string;
  categoria: string;
  estado: string;
  searchInst: string;
  keyword: string;
  dateRange: DateRange;
  selectedSectors: string[];
  selectedProviders: string[];
  pinned: any[];
  compareModeActive: boolean;
}

export interface Bookmark {
  name: string;
  filters: Partial<FilterState> & { institucion?: string };
  timestamp: Date;
}

export interface ViewState {
  layout: 'default' | 'comparison';
  filtersPanelCollapsed: boolean;
  selectedKPI: string | null;
  drilldownPath: string[];
  timelineVisible: boolean;
  bookmarks: Bookmark[];
}

export interface DashboardStore {
  filters: FilterState;
  view: ViewState;
  
  // Filter actions
  setInstitucion: (institucion: string) => void;
  setDateRange: (range: DateRange) => void;
  setAnioDesde: (año: string) => void;
  setAnioHasta: (año: string) => void;
  setProcedimientos: (proc: string) => void;
  setCategoria: (cat: string) => void;
  setEstado: (estado: string) => void;
  setSearchInst: (search: string) => void;
  setKeyword: (kw: string) => void;
  setSectors: (sectors: string[]) => void;
  setProviders: (providers: string[]) => void;
  clearFilters: () => void;
  
  // View actions
  setFiltersPanelCollapsed: (collapsed: boolean) => void;
  setSelectedKPI: (kpi: string | null) => void;
  pushDrilldown: (level: string) => void;
  popDrilldown: () => void;
  clearDrilldown: () => void;
  toggleTimeline: () => void;
  
  // Pin & Compare
  pinSelection: (data: Record<string, unknown>) => void;
  removePinned: (index: number) => void;
  toggleCompareMode: () => void;
  
  // Bookmarks
  saveBookmark: (name: string) => void;
  loadBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (index: number) => void;
  
  // URL Sync
  syncFromURL: () => void;
  syncToURL: () => void;
}

const initialFilters: FilterState = {
  institucion: '',
  anioDesde: '',
  anioHasta: '',
  procedimientos: '',
  categoria: '',
  estado: '',
  searchInst: '',
  keyword: '',
  dateRange: {},
  selectedSectors: [],
  selectedProviders: [],
  pinned: [],
  compareModeActive: false,
};

const initialView: ViewState = {
  layout: 'default',
  filtersPanelCollapsed: false,
  selectedKPI: null,
  drilldownPath: [],
  timelineVisible: true,
  bookmarks: ((): Bookmark[] => {
    try {
      const raw = JSON.parse(localStorage.getItem('sicop-bookmarks') || '[]');
      return Array.isArray(raw)
        ? raw.map((b: any) => ({
            name: String(b.name),
            filters: b.filters || {},
            timestamp: new Date(b.timestamp)
          }))
        : [];
    } catch {
      return [];
    }
  })(),
};

const creator: StateCreator<DashboardStore, [["zustand/devtools", never], ["zustand/subscribeWithSelector", never]]> = (set: any, get: any) => ({
      filters: initialFilters,
      view: initialView,

      // Filter actions
      setInstitucion: (institucion: string) => {
        set((state: DashboardStore) => ({ 
          filters: { ...state.filters, institucion },
          view: { ...state.view, drilldownPath: [] }
        }));
        get().syncToURL();
      },

      setDateRange: (range: DateRange) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, dateRange: range } }));
        get().syncToURL();
      },

      setAnioDesde: (anioDesde: string) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, anioDesde } }));
        get().syncToURL();
      },

      setAnioHasta: (anioHasta: string) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, anioHasta } }));
        get().syncToURL();
      },

      setProcedimientos: (procedimientos: string) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, procedimientos } }));
        get().syncToURL();
      },

      setCategoria: (categoria: string) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, categoria } }));
        get().syncToURL();
      },

      setEstado: (estado: string) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, estado } }));
        get().syncToURL();
      },

      setSearchInst: (searchInst: string) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, searchInst } }));
      },

      setKeyword: (keyword: string) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, keyword } }));
        get().syncToURL();
      },

      setSectors: (selectedSectors: string[]) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, selectedSectors } }));
        get().syncToURL();
      },

      setProviders: (selectedProviders: string[]) => {
        set((state: DashboardStore) => ({ filters: { ...state.filters, selectedProviders } }));
        get().syncToURL();
      },

      clearFilters: () => {
        set((state: DashboardStore) => ({ 
          filters: { ...initialFilters, institucion: state.filters.institucion },
          view: { ...state.view, drilldownPath: [], selectedKPI: null }
        }));
        get().syncToURL();
      },

      // View actions
      setFiltersPanelCollapsed: (filtersPanelCollapsed: boolean) => {
        set((state: DashboardStore) => ({ view: { ...state.view, filtersPanelCollapsed } }));
      },

      setSelectedKPI: (selectedKPI: string | null) => {
        set((state: DashboardStore) => ({ view: { ...state.view, selectedKPI } }));
      },

      pushDrilldown: (level: string) => {
        set((state: DashboardStore) => ({ 
          view: { 
            ...state.view, 
            drilldownPath: [...state.view.drilldownPath, level] 
          } 
        }));
      },

      popDrilldown: () => {
        set((state: DashboardStore) => ({ 
          view: { 
            ...state.view, 
            drilldownPath: state.view.drilldownPath.slice(0, -1) 
          } 
        }));
      },

      clearDrilldown: () => {
        set((state: DashboardStore) => ({ view: { ...state.view, drilldownPath: [] } }));
      },

      toggleTimeline: () => {
        set((state: DashboardStore) => ({ 
          view: { ...state.view, timelineVisible: !state.view.timelineVisible } 
        }));
      },

      // Pin & Compare
      pinSelection: (data: Record<string, unknown>) => {
        set((state: DashboardStore) => ({ 
          filters: { 
            ...state.filters, 
            pinned: [...state.filters.pinned, { ...data, pinnedAt: new Date() }] 
          } 
        }));
      },

      removePinned: (index: number) => {
        set((state: DashboardStore) => ({ 
          filters: { 
            ...state.filters, 
            pinned: state.filters.pinned.filter((_, i) => i !== index) 
          } 
        }));
      },

      toggleCompareMode: () => {
        set((state: DashboardStore) => ({ 
          filters: { 
            ...state.filters, 
            compareModeActive: !state.filters.compareModeActive 
          } 
        }));
      },

      // Bookmarks
      saveBookmark: (name: string) => {
        const { filters } = get();
        const bookmark: Bookmark = { 
          name, 
          filters: { ...filters }, 
          timestamp: new Date() 
        };
        set((state: DashboardStore) => ({ 
          view: { 
            ...state.view, 
            bookmarks: [...state.view.bookmarks, bookmark] 
          } 
        }));
        localStorage.setItem('sicop-bookmarks', JSON.stringify(get().view.bookmarks));
      },

      loadBookmark: (bookmark: Bookmark) => {
        set((state: DashboardStore) => ({ 
          filters: { ...state.filters, ...bookmark.filters },
          view: { ...state.view, drilldownPath: [] }
        }));
        get().syncToURL();
      },

      removeBookmark: (index: number) => {
        set((state: DashboardStore) => ({ 
          view: { 
            ...state.view, 
            bookmarks: state.view.bookmarks.filter((_, i) => i !== index) 
          } 
        }));
        localStorage.setItem('sicop-bookmarks', JSON.stringify(get().view.bookmarks));
      },

      // URL Sync
      syncFromURL: () => {
        const params = new URLSearchParams(window.location.search);
        const filters: Partial<FilterState> = {};
        
        if (params.get('inst')) filters.institucion = params.get('inst')!;
        if (params.get('sector')) filters.selectedSectors = params.get('sector')!.split(',');
        if (params.get('desde')) filters.anioDesde = params.get('desde')!;
        if (params.get('hasta')) filters.anioHasta = params.get('hasta')!;
        if (params.get('proc')) filters.procedimientos = params.get('proc')!;
        if (params.get('cat')) filters.categoria = params.get('cat')!;
        if (params.get('kw')) filters.keyword = params.get('kw')!;

        set((state: DashboardStore) => ({ filters: { ...state.filters, ...filters } }));
      },

      syncToURL: () => {
        const { filters } = get();
        const params = new URLSearchParams();
        
        if (filters.institucion) params.set('inst', filters.institucion);
        if (filters.selectedSectors.length) params.set('sector', filters.selectedSectors.join(','));
        if (filters.anioDesde) params.set('desde', filters.anioDesde);
        if (filters.anioHasta) params.set('hasta', filters.anioHasta);
        if (filters.procedimientos) params.set('proc', filters.procedimientos);
        if (filters.categoria) params.set('cat', filters.categoria);
        if (filters.keyword) params.set('kw', filters.keyword);

        const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newURL);
      },
});

export const useDashboardStore = create<DashboardStore>()(
  devtools(subscribeWithSelector(creator))
);

// Initialize from URL on load
if (typeof window !== 'undefined') {
  useDashboardStore.getState().syncFromURL();
}