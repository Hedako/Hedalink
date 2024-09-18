export function randomTask() {
    const tasks = [
        'Watch this video',
        'Like this post',
        'Share this page',
        'Follow on Instagram',
        'Join the Telegram group'
    ];
    const randomIndex = Math.floor(Math.random() * tasks.length);
    return tasks[randomIndex];
}
