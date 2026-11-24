import {Link, useLocation} from "react-router";

const VisualizerId = () => {
    const location = useLocation();
    const {initialImage, name} = location.state || {};

    if (!location.state) {
        return <section><p>This project could not be opened. Please return home and try again.</p><Link to="/">Back to home</Link></section>;
    }

    return(
        <section>
            <h1>{name || 'Untitled Project'}</h1>
            <div className="visualizer">
                {initialImage &&(
                    <div className="image-container">
                        <h2>Source Image</h2>
                        <img src={initialImage} alt="source"/>
                    </div>
                )}
            </div>
        </section>
    )
}
export default VisualizerId