export class Contador {

    private countdownUpdater: NodeJS.Timeout | null = null

    constructor(
        public count: number,
        private onUpdate: (mmss: string) => void,
        private onZeroReached: () => void = () => {}
        //private isTimerOn: boolean
        
    ) {
            //this.setTimer();
    }

    public get isPaused(): boolean {
        return this.countdownUpdater == null;
    }

    public pause = () => {
        if (this.countdownUpdater != null) {
            clearInterval(this.countdownUpdater);
            this.countdownUpdater = null;
        }
    }

    public setValue = (countSeconds: number) => {
        this.count = countSeconds;
        if (this.countdownUpdater == null) {
            this.setTimer();
        }
    }

    public increment = (incrementBy: number) => {
        this.setValue(this.count + incrementBy);
    }

    public getDisplayValue = () => {
        // TODO: Handle times that also include an hour
        const count = this.count;
        return `${count}/4`;
    }

    
  

    private setTimer = () => {
        this.countdownUpdater = setInterval(() =>  {
            if (this.count < 100) {
                this.count++;
                this.updateValue();
            } else {
                this.pause();
                this.onZeroReached();
            }
        }, 1000);

        this.updateValue();
    }



    private updateValue = () => {
        const displayValue = this.getDisplayValue();
        this.onUpdate(displayValue);
    }

    public resetValue = () => {
        this.pause();
        this.count = 0;
        this.updateValue();       
    }

    public lessValue = () => {

            if (this.count > 0) {
                this.count--;
                this.updateValue();
            } 
        this.updateValue();
    
    }

    public addValue = () => {

        if (this.count < 4) {
            this.count++;
            this.updateValue();
        } 
    this.updateValue();

    }

    





}
