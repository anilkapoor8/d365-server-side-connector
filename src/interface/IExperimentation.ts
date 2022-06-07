
/**
 * State of an experiment
 */
 export enum State {
    Draft = 'DRAFT',
    Trashed = 'TRASHED',
    Running = 'RUNNING',
    Paused = 'PAUSED',
    Archived = 'ARCHIVED',
    Enabled = 'ENABLED',
    Disabled = 'DISABLED'
}

/**
 * Variations on each experiment
 */
 export interface IVariations {
    friendlyName: string;
    id: string;
    status: State;
    weight?: string;
}

/**
 * Experiments
 */
export interface IExperiments {
    friendlyName: string;
    id: string;
    status: State;
    variations: IVariations[];
    createdDate?: string;
    lastModifiedDate?: string;
    lastModifiedBy?: string;
    description?: string;
    type?: string;
    link?: string;
    resultLink?: string;
}

/**
 * Experiments
 */
export interface IVariants {
    variantId: string;
    experimentId: string;
    moduleId?: string;
}

export interface IExperimentationProvider {

    /**
     * Allows the experimentation connector to do any startup related tasks
     * using the config provided by the partner.
     *
     * This method is only called once during server startup.
     * @param config The configuration provided in connector.settings.json
     */
    initialize(config: any): Promise<boolean>;

    /**
     * Returns the configuration that should be passed to the experimentation connector
     * when it is initialized client-side
     */
    getConfigForClientSideInit(): Promise<any>;

    /**
     * Initializes the experimentation provider on the browser (client-side) so that
     * it may activate experiments for a user.
     *
     * @param config The config that is required to initialize the experimentation connector
     * client-side. The result of getConfigForClientSideInit() is passed into this method
     */
    initializeClientSide(config: any): boolean;

    /**
     * Returns a list of all the experiments currently configured whether active or not.
     * This list will be cached and periodically refreshed.
     * @param page Optional argument that specifies the page to return.
     * @param items Optional argument that specifies the maximum number of objects to return per request.
     */
    getExperiments(page?: string, items?: string): Promise<IExperiments[]>;

    /**
     * Returns a list of experiments and variants a user will be a part of based
     * off the userId. Optional attributes can provide the connector with additional criteria
     * to determine which experiments a user should be a part of.
     *
     * @param userId userId unique to a user if signed in or unique to a session if user is anonymous.
     * userId will be generated from hash if user is signed-in to deterministically generate sanitized userIds.
     * @param attributes Optional user related attributes
     */
    getVariantsForUser(userId: string, attributes?: {
        [index: string]: string;
    }): IVariants[];

    /**
     * Activates experiment(s) a user is currently being served. This call will be made
     * client-side after the connector has been initialized client-side
     *
     * @param userId userId unique to a user if signed in or unique to a session if user is anonymous.
     * userId will be generated from hash if user is signed-in to deterministically generate sanitized userIds.
     * @param experiments The experiments the user is participating in.
     * @param attributes Optional user related attributes
     */
    activateExperiment(userId: string, experiments: IVariants[], attributes?: {
        [index: string]: string;
    }): boolean;
}

export interface IExperimentationListener {
    
    /**
     * Initializes the experimentation listener on the browser (client-side) so that
     * it may keep track of any conversion events related to the current experiments.
     *
     * @param config The config that is required to initialize the experimentation connector
     * client-side. The result of the provider file's getConfigForClientSideInit() is passed into this method
     * @param userId The user ID of the current user being served the experiment
     */
    initializeClientSide(config: any, userId: string): boolean;
   
    /**
     * Tracks a successful user conversion event.
     *
     * @param eventType The name of the event that occurred
     * @param payload Any additional tags or data related to the conversion event
     * @param attributes Optional parameter containing user attributes pertaining to the user that triggered the event
     */
    trackEvent(eventType: string, payload: any, attributes?: any): void;
}