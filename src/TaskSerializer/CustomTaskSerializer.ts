import type { Moment } from 'moment';
import { TaskLayoutComponent } from '../Layout/TaskLayoutOptions';
import { OnCompletion, parseOnCompletionValue } from '../Task/OnCompletion';
import { Occurrence } from '../Task/Occurrence';
import { Recurrence } from '../Task/Recurrence';
import { Task } from '../Task/Task';
import { Priority } from '../Task/Priority';
import { TaskRegularExpressions } from '../Task/TaskRegularExpressions';
import { DefaultTaskSerializer, taskIdRegex, taskIdSequenceRegex } from './DefaultTaskSerializer';
import type { TaskDetails } from '.';
import { getSettings } from '../Config/Settings';

export class CustomTaskSerializer extends DefaultTaskSerializer {
    constructor() {
        // We pass empty symbols initially to the parent, but we immediately override the symbols property
        super({
            prioritySymbols: {
                Highest: '',
                High: '',
                Medium: '',
                Low: '',
                Lowest: '',
                None: '',
            },
            startDateSymbol: '',
            createdDateSymbol: '',
            scheduledDateSymbol: '',
            dueDateSymbol: '',
            doneDateSymbol: '',
            cancelledDateSymbol: '',
            recurrenceSymbol: '',
            onCompletionSymbol: '',
            dependsOnSymbol: '',
            idSymbol: '',
            TaskFormatRegularExpressions: {
                priorityRegex: new RegExp(''),
                startDateRegex: new RegExp(''),
                createdDateRegex: new RegExp(''),
                scheduledDateRegex: new RegExp(''),
                dueDateRegex: new RegExp(''),
                doneDateRegex: new RegExp(''),
                cancelledDateRegex: new RegExp(''),
                recurrenceRegex: new RegExp(''),
                onCompletionRegex: new RegExp(''),
                dependsOnRegex: new RegExp(''),
                idRegex: new RegExp(''),
            },
        });

        Object.defineProperty(this, 'symbols', {
            get: () => this.generateSymbols(),
            configurable: true,
            enumerable: true,
        });
    }

    private getCustomSettings() {
        return getSettings().customFormatSettings;
    }

    private convertDateFormatToRegex(format: string): string {
        // This is a basic conversion, it might need to be more robust for all moment.js formats
        // Escaping dot for regex
        let regex = format.replace(/\./g, '\\.');
        regex = regex.replace(/YYYY/g, '\\d{4}');
        regex = regex.replace(/YY/g, '\\d{2}');
        regex = regex.replace(/MM/g, '\\d{2}');
        regex = regex.replace(/DD/g, '\\d{2}');
        return regex;
    }

    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    private createPatternRegex(pattern: string, valueRegex: string): RegExp {
        const parts = pattern.split(/%date%|%value%/);
        const escapedParts = parts.map((part) => this.escapeRegExp(part));
        // Construct regex: part1 + value + part2, allowing flexibility for spaces if needed, but strict based on user input
        // Using strict user input for now as requested.
        return new RegExp(escapedParts.join(valueRegex) + '$');
    }

    private generateSymbols() {
        const settings = this.getCustomSettings();
        const dateFormatRegex = this.convertDateFormatToRegex(settings.dateFormat);
        const dateCaptureRegex = '(' + dateFormatRegex + ')';

        return {
            prioritySymbols: {
                Highest: settings.priorityHighest,
                High: settings.priorityHigh,
                Medium: settings.priorityMedium,
                Low: settings.priorityLow,
                Lowest: settings.priorityLowest,
                None: settings.priorityNone,
            },
            startDateSymbol: settings.startDatePattern.replace('%date%', ''), // Approximate for visual consistency in some contexts
            createdDateSymbol: settings.createdDatePattern.replace('%date%', ''),
            scheduledDateSymbol: settings.scheduledDatePattern.replace('%date%', ''),
            dueDateSymbol: settings.dueDatePattern.replace('%date%', ''),
            doneDateSymbol: settings.doneDatePattern.replace('%date%', ''),
            cancelledDateSymbol: settings.cancelledDatePattern.replace('%date%', ''),
            recurrenceSymbol: settings.recurrencePattern.replace('%value%', ''),
            onCompletionSymbol: settings.onCompletionPattern.replace('%value%', ''),
            dependsOnSymbol: settings.dependsOnPattern.replace('%value%', ''),
            idSymbol: settings.idPattern.replace('%value%', ''),
            TaskFormatRegularExpressions: {
                priorityRegex: new RegExp(
                    '(' +
                        [
                            settings.priorityHighest,
                            settings.priorityHigh,
                            settings.priorityMedium,
                            settings.priorityLow,
                            settings.priorityLowest,
                        ]
                            .filter((s) => s.length > 0)
                            .map((s) => this.escapeRegExp(s))
                            .join('|') +
                        ')',
                ),
                startDateRegex: this.createPatternRegex(settings.startDatePattern, dateCaptureRegex),
                createdDateRegex: this.createPatternRegex(settings.createdDatePattern, dateCaptureRegex),
                scheduledDateRegex: this.createPatternRegex(settings.scheduledDatePattern, dateCaptureRegex),
                dueDateRegex: this.createPatternRegex(settings.dueDatePattern, dateCaptureRegex),
                doneDateRegex: this.createPatternRegex(settings.doneDatePattern, dateCaptureRegex),
                cancelledDateRegex: this.createPatternRegex(settings.cancelledDatePattern, dateCaptureRegex),
                recurrenceRegex: this.createPatternRegex(settings.recurrencePattern, '([a-zA-Z0-9, !]+)'),
                onCompletionRegex: this.createPatternRegex(settings.onCompletionPattern, '([a-zA-Z]+)'),
                dependsOnRegex: this.createPatternRegex(
                    settings.dependsOnPattern,
                    '(' + taskIdSequenceRegex.source + ')',
                ),
                idRegex: this.createPatternRegex(settings.idPattern, '(' + taskIdRegex.source + ')'),
            },
        };
    }

    public componentToString(task: Task, _shortMode: boolean, component: TaskLayoutComponent) {
        const settings = this.getCustomSettings();
        const dateFormat = settings.dateFormat;

        switch (component) {
            case TaskLayoutComponent.Description:
                return task.description;
            case TaskLayoutComponent.Priority: {
                switch (task.priority) {
                    case Priority.Highest:
                        return settings.priorityHighest ? ` ${settings.priorityHighest}` : '';
                    case Priority.High:
                        return settings.priorityHigh ? ` ${settings.priorityHigh}` : '';
                    case Priority.Medium:
                        return settings.priorityMedium ? ` ${settings.priorityMedium}` : '';
                    case Priority.Low:
                        return settings.priorityLow ? ` ${settings.priorityLow}` : '';
                    case Priority.Lowest:
                        return settings.priorityLowest ? ` ${settings.priorityLowest}` : '';
                    default:
                        return '';
                }
            }
            case TaskLayoutComponent.StartDate:
                return task.startDate
                    ? ' ' + settings.startDatePattern.replace('%date%', task.startDate.format(dateFormat))
                    : '';
            case TaskLayoutComponent.CreatedDate:
                return task.createdDate
                    ? ' ' + settings.createdDatePattern.replace('%date%', task.createdDate.format(dateFormat))
                    : '';
            case TaskLayoutComponent.ScheduledDate:
                if (task.scheduledDateIsInferred) return '';
                return task.scheduledDate
                    ? ' ' + settings.scheduledDatePattern.replace('%date%', task.scheduledDate.format(dateFormat))
                    : '';
            case TaskLayoutComponent.DoneDate:
                return task.doneDate
                    ? ' ' + settings.doneDatePattern.replace('%date%', task.doneDate.format(dateFormat))
                    : '';
            case TaskLayoutComponent.CancelledDate:
                return task.cancelledDate
                    ? ' ' + settings.cancelledDatePattern.replace('%date%', task.cancelledDate.format(dateFormat))
                    : '';
            case TaskLayoutComponent.DueDate:
                return task.dueDate
                    ? ' ' + settings.dueDatePattern.replace('%date%', task.dueDate.format(dateFormat))
                    : '';
            case TaskLayoutComponent.RecurrenceRule:
                if (!task.recurrence) return '';
                return ' ' + settings.recurrencePattern.replace('%value%', task.recurrence.toText());
            case TaskLayoutComponent.OnCompletion:
                if (task.onCompletion === OnCompletion.Ignore) return '';
                return ' ' + settings.onCompletionPattern.replace('%value%', task.onCompletion);
            case TaskLayoutComponent.DependsOn: {
                if (task.dependsOn.length === 0) return '';
                return ' ' + settings.dependsOnPattern.replace('%value%', task.dependsOn.join(','));
            }
            case TaskLayoutComponent.Id:
                return ' ' + settings.idPattern.replace('%value%', task.id);
            case TaskLayoutComponent.BlockLink:
                return task.blockLink ?? '';
            default:
                // Fallback to default behavior if component not handled or throw
                // But since we inherit from DefaultTaskSerializer and we override componentToString, we should cover all.
                // Re-using DefaultTaskSerializer.componentToString is tricky because it relies on fixed symbols.
                return '';
        }
    }

    public deserialize(line: string): TaskDetails {
        // Need to override deserialize because parent uses `this.symbols` which we override via getter.
        // However, parent's deserialize method calls `parsePriority` which uses `this.symbols.prioritySymbols`.
        // And it calls `window.moment(..., TaskRegularExpressions.dateFormat)`.
        // WE NEED TO OVERRIDE THE DATE FORMAT used in parsing.
        // The parent `deserialize` hardcodes `TaskRegularExpressions.dateFormat` (YYYY-MM-DD).
        // So we MUST essentially copy-paste `deserialize` and change the date parsing logic.

        const { TaskFormatRegularExpressions } = this.symbols;
        const settings = this.getCustomSettings();
        const dateFormat = settings.dateFormat;

        let matched: boolean;
        let priority: Priority = Priority.None;
        let startDate: Moment | null = null;
        let scheduledDate: Moment | null = null;
        let dueDate: Moment | null = null;
        let doneDate: Moment | null = null;
        let cancelledDate: Moment | null = null;
        let createdDate: Moment | null = null;
        let recurrenceRule: string = '';
        let recurrence: Recurrence | null = null;
        let onCompletion: OnCompletion = OnCompletion.Ignore;
        let id: string = '';
        let dependsOn: string[] | [] = [];
        let trailingTags = '';
        const maxRuns = 20;
        let runs = 0;

        do {
            matched = false;
            const priorityMatch = line.match(TaskFormatRegularExpressions.priorityRegex);
            if (priorityMatch !== null) {
                priority = this.parsePriority(priorityMatch[1]);
                line = line.replace(TaskFormatRegularExpressions.priorityRegex, '').trim();
                matched = true;
            }

            const doneDateMatch = line.match(TaskFormatRegularExpressions.doneDateRegex);
            if (doneDateMatch !== null) {
                doneDate = window.moment(doneDateMatch[1], dateFormat);
                line = line.replace(TaskFormatRegularExpressions.doneDateRegex, '').trim();
                matched = true;
            }

            const cancelledDateMatch = line.match(TaskFormatRegularExpressions.cancelledDateRegex);
            if (cancelledDateMatch !== null) {
                cancelledDate = window.moment(cancelledDateMatch[1], dateFormat);
                line = line.replace(TaskFormatRegularExpressions.cancelledDateRegex, '').trim();
                matched = true;
            }

            const dueDateMatch = line.match(TaskFormatRegularExpressions.dueDateRegex);
            if (dueDateMatch !== null) {
                dueDate = window.moment(dueDateMatch[1], dateFormat);
                line = line.replace(TaskFormatRegularExpressions.dueDateRegex, '').trim();
                matched = true;
            }

            const scheduledDateMatch = line.match(TaskFormatRegularExpressions.scheduledDateRegex);
            if (scheduledDateMatch !== null) {
                scheduledDate = window.moment(scheduledDateMatch[1], dateFormat);
                line = line.replace(TaskFormatRegularExpressions.scheduledDateRegex, '').trim();
                matched = true;
            }

            const startDateMatch = line.match(TaskFormatRegularExpressions.startDateRegex);
            if (startDateMatch !== null) {
                startDate = window.moment(startDateMatch[1], dateFormat);
                line = line.replace(TaskFormatRegularExpressions.startDateRegex, '').trim();
                matched = true;
            }

            const createdDateMatch = line.match(TaskFormatRegularExpressions.createdDateRegex);
            if (createdDateMatch !== null) {
                createdDate = window.moment(createdDateMatch[1], dateFormat);
                line = line.replace(TaskFormatRegularExpressions.createdDateRegex, '').trim();
                matched = true;
            }

            const recurrenceMatch = line.match(TaskFormatRegularExpressions.recurrenceRegex);
            if (recurrenceMatch !== null) {
                recurrenceRule = recurrenceMatch[1].trim();
                line = line.replace(TaskFormatRegularExpressions.recurrenceRegex, '').trim();
                matched = true;
            }

            const onCompletionMatch = line.match(TaskFormatRegularExpressions.onCompletionRegex);
            if (onCompletionMatch != null) {
                line = line.replace(TaskFormatRegularExpressions.onCompletionRegex, '').trim();
                const inputOnCompletionValue = onCompletionMatch[1];
                onCompletion = parseOnCompletionValue(inputOnCompletionValue);
                matched = true;
            }

            const tagsMatch = line.match(TaskRegularExpressions.hashTagsFromEnd);
            if (tagsMatch != null) {
                line = line.replace(TaskRegularExpressions.hashTagsFromEnd, '').trim();
                matched = true;
                const tagName = tagsMatch[0].trim();
                trailingTags = trailingTags.length > 0 ? [tagName, trailingTags].join(' ') : tagName;
            }

            const idMatch = line.match(TaskFormatRegularExpressions.idRegex);
            if (idMatch != null) {
                line = line.replace(TaskFormatRegularExpressions.idRegex, '').trim();
                id = idMatch[1].trim();
                matched = true;
            }

            const dependsOnMatch = line.match(TaskFormatRegularExpressions.dependsOnRegex);
            if (dependsOnMatch != null) {
                line = line.replace(TaskFormatRegularExpressions.dependsOnRegex, '').trim();
                dependsOn = dependsOnMatch[1]
                    .replace(/ /g, '')
                    .split(',')
                    .filter((item) => item !== '');
                matched = true;
            }

            runs++;
        } while (matched && runs <= maxRuns);

        if (recurrenceRule.length > 0) {
            recurrence = Recurrence.fromText({
                recurrenceRuleText: recurrenceRule,
                occurrence: new Occurrence({ startDate, scheduledDate, dueDate }),
            });
        }
        if (trailingTags.length > 0) line += ' ' + trailingTags;

        return {
            description: line,
            priority,
            startDate,
            createdDate,
            scheduledDate,
            dueDate,
            doneDate,
            cancelledDate,
            recurrence,
            onCompletion,
            id,
            dependsOn,
            tags: Task.extractHashtags(line),
        };
    }
}
