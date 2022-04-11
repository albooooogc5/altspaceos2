"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contador = void 0;
class Contador {
    constructor(count, onUpdate, onZeroReached = () => { }
    //private isTimerOn: boolean
    ) {
        this.count = count;
        this.onUpdate = onUpdate;
        this.onZeroReached = onZeroReached;
        this.countdownUpdater = null;
        this.pause = () => {
            if (this.countdownUpdater != null) {
                clearInterval(this.countdownUpdater);
                this.countdownUpdater = null;
            }
        };
        this.setValue = (countSeconds) => {
            this.count = countSeconds;
            if (this.countdownUpdater == null) {
                this.setTimer();
            }
        };
        this.increment = (incrementBy) => {
            this.setValue(this.count + incrementBy);
        };
        this.getDisplayValue = () => {
            // TODO: Handle times that also include an hour
            const count = this.count;
            return `${count}/4`;
        };
        this.setTimer = () => {
            this.countdownUpdater = setInterval(() => {
                if (this.count < 100) {
                    this.count++;
                    this.updateValue();
                }
                else {
                    this.pause();
                    this.onZeroReached();
                }
            }, 1000);
            this.updateValue();
        };
        this.updateValue = () => {
            const displayValue = this.getDisplayValue();
            this.onUpdate(displayValue);
        };
        this.resetValue = () => {
            this.pause();
            this.count = 0;
            this.updateValue();
        };
        this.lessValue = () => {
            if (this.count > 0) {
                this.count--;
                this.updateValue();
            }
            this.updateValue();
        };
        this.addValue = () => {
            if (this.count < 4) {
                this.count++;
                this.updateValue();
            }
            this.updateValue();
        };
        //this.setTimer();
    }
    get isPaused() {
        return this.countdownUpdater == null;
    }
}
exports.Contador = Contador;
//# sourceMappingURL=contador.js.map