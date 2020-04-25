import minimist from 'minimist';

export default function getArg(key, fallback=null) {
    const allArgs = minimist(process.argv.slice(2));

    return allArgs[key] || fallback;
}
