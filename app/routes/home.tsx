import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import { ArrowRight, ArrowUpRight, Clock, Layers } from "lucide-react";
import Navbar from "../../components/Navbar";
import Button from "../../components/ui/Button";
import Upload from "../../components/upload";
import { createProject, listProjects } from "../../lib/puter.action";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Planova | AI Floor Plan Renderer" },
        {
            name: "description",
            content: "Turn 2D floor plans into photorealistic 3D architectural renders.",
        },
    ];
}

export const getVisualizerState = (project: DesignItem): VisualizerLocationState => ({
    initialImage: project.sourceImage,
    initialRender: project.renderedImage ?? null,
    name: project.name,
});

export default function Home() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const {authState} = useOutletContext<{authState: AuthState}>();

    useEffect(() => {
        let active = true;
        setProjects([]);
        if (authState.isSignedIn) {
            listProjects().then((saved) => {
                if (active) setProjects((current) => [
                    ...current,
                    ...saved.filter((item) => !current.some((project) => project.id === item.id)),
                ]);
            }).catch((error) => console.error("Failed to load projects", error));
        }
        return () => { active = false; };
    }, [authState.isSignedIn, authState.userId]);

    const handleUploadComplete = async (base64: string): Promise<boolean> => {
        const newId = Date.now().toString();
        const name = `Residence ${newId}`;

        const newItem: DesignItem = {
            id: newId,
            name,
            sourceImage: base64,
            renderedImage: null,
            timestamp: Date.now(),
        };

        const saved = await createProject({ item: newItem, visibility: "private" });
        if (!saved) {
            console.log("Failed to create project");
            return false;
        }

        setProjects((prev) => [saved, ...prev]);

        navigate(`/visualizer/${newId}`, {
            state: getVisualizerState(saved),
        });

        return true;
    };

    return (
        <div className="home">
            <Navbar />
            <section className="hero">
                <div className="announce">
                    <div className="dot">
                        <div className="pulse"></div>
                    </div>
                    <p>Introducing planova 2.0</p>
                </div>
                <h1>Build beautiful spaces at the speed of thoughts with planova</h1>
                <p className="subtitle">planova is an AI-powered design environment that helps you visualize, render, and ship, architectural projects faster than ever.</p>
                <div className="actions">
                    <a href="#upload" className="cta">Starting Building <ArrowRight className="icon" /></a>
                    <Button variant="outline" size="lg" className="demo">Watch Demo</Button>
                </div>
                <div id="upload" className="upload-shell">
                    <div className="grid-overlay" />
                    <div className="upload-card">
                        <div className="upload-head">
                            <div className="upload-icon">
                                <Layers className="icon" />
                            </div>
                            <h3>Upload your floor plan</h3>
                            <p>Supports JPG, PNG formats up to 10MB</p>
                        </div>
                        <Upload onComplete={handleUploadComplete} />
                    </div>
                </div>
            </section>

            <section className="projects">
                <div className="section-inner">
                    <div className="section-head">
                        <div className="copy">
                            <h2>Projects</h2>
                            <p>Your latest work and shared community projects, all in one place. </p>
                        </div>
                    </div>
                    <div className="projects-grid">

                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                to={`/visualizer/${project.id}`}
                                state={getVisualizerState(project)}
                                className="project-card group"
                            >

                                <div className="preview">
                                    <img src={project.sourceImage} alt={project.name ?? "Project"} />
                                    <div className="badge">
                                        <span>Private</span>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div>
                                        <h3>{project.name ?? "Untitled project"}</h3>
                                        <div className="meta">
                                            <Clock size={12} />
                                            <span>{new Date(project.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="arrow">
                                        <ArrowUpRight size={18} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {projects.map(({id, name, renderedImage, sourceImage, timestamp}) =>(
                            <div key={id} className="project-card group">
                            <div className="preview">
                            <img src={renderedImage || sourceImage} alt="Project" />
                            <div className="badge">
                            <span>Community</span>
                            </div>
                            </div>
                            <div className="card-body">
                            <div>
                            <h3>{name}</h3>
                            <div className="meta">
                            <Clock size={12} />
                    <span>{new Date(timestamp).toLocaleDateString()}</span>
                    <span>By baby</span>
                </div>
        </div>
    <div className="arrow">
        <ArrowUpRight size={18} />
    </div>
</div>
</div>
                            ))}

                    </div>
                </div>
            </section>
        </div>
    );
}
