from flask import Flask,render_template,Response
import cv2
from concurrent.futures import ThreadPoolExecutor
import os
import random
import time
app=Flask(__name__)
camera_test=cv2.VideoCapture(0)

def generate_frames():
    while True:
            
        ## read the camera frame
        success,frame=camera_test.read()
        if not success:
            break
        else:
            ret,buffer=cv2.imencode('.jpg',frame)
            frame=buffer.tobytes()

        yield(b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')



@app.route('/video')
def video():
    return Response(generate_frames(),mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__=="__main__":
    app.run()


def map_async(iterable, func, max_workers=os.cpu_count()):
    # Generator that applies func to the input using max_workers concurrent jobs
    def async_iterator():
        iterator = iter(iterable)
        pending_results = []
        has_input = True
        thread_pool = ThreadPoolExecutor(max_workers)
        while True:
            # Submit jobs for remaining input until max_worker jobs are running
            while has_input and \
                    len([e for e in pending_results if e.running()]) \
                        < max_workers:
                try:
                    e = next(iterator)
                    print('Submitting task...')
                    pending_results.append(thread_pool.submit(func, e))
                except StopIteration:
                    print('Submitted all task.')
                    has_input = False

            # If there are no pending results, the generator is done
            if not pending_results:
                return

            # If the oldest job is done, return its value
            if pending_results[0].done():
                yield pending_results.pop(0).result()
            # Otherwise, yield the CPU, then continue starting new jobs
            else:
                time.sleep(.01)

    return async_iterator()

def example_generator():
    for i in range(20):
        print('Creating task', i)
        yield i

def do_work(i):
    print('Starting to work on', i)
    time.sleep(random.uniform(0, 3))
    print('Done with', i)
    return i

random.seed(42)
for i in map_async(example_generator(), do_work):
    print('Got result:', i)